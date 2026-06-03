"""
Model Loading and Caching System

This module implements a comprehensive model management system with intelligent
caching, lazy loading, and resource optimization for the AR Fashion Try-On system.
"""

from typing import Dict, List, Optional, Any, Callable, Set
from collections import OrderedDict
import asyncio
import time
import logging
import threading
from pathlib import Path
from dataclasses import dataclass, field
import psutil
import torch
from concurrent.futures import ThreadPoolExecutor

from .models import BaseModel, ModelConfig, ModelFactory, ModelStatus, ModelType
from .device_manager import DeviceManager

logger = logging.getLogger(__name__)


@dataclass
class CacheConfig:
    """Configuration for model caching"""
    max_models_in_memory: int = 3
    max_memory_usage_mb: int = 4096
    enable_lazy_loading: bool = True
    cache_eviction_strategy: str = "lru"  # lru, lfu, fifo
    model_warmup_on_load: bool = True
    background_loading: bool = True
    memory_check_interval: float = 60.0  # seconds


@dataclass 
class ModelEntry:
    """Entry in the model cache"""
    model: BaseModel
    last_accessed: float
    access_count: int = 0
    memory_usage_mb: float = 0.0
    loading_task: Optional[asyncio.Task] = None
    
    def touch(self):
        """Update access time and count"""
        self.last_accessed = time.time()
        self.access_count += 1


class ModelCache:
    """Intelligent model caching system"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache: OrderedDict[str, ModelEntry] = OrderedDict()
        self.loading_models: Set[str] = set()
        self.lock = asyncio.Lock()
        self.logger = logging.getLogger(f"{__name__}.ModelCache")
        
        # Background tasks
        self.memory_monitor_task: Optional[asyncio.Task] = None
        self._start_background_tasks()
    
    def _start_background_tasks(self):
        """Start background monitoring tasks"""
        if self.config.memory_check_interval > 0:
            self.memory_monitor_task = asyncio.create_task(self._memory_monitor())
    
    async def _memory_monitor(self):
        """Background task to monitor memory usage"""
        while True:
            try:
                await asyncio.sleep(self.config.memory_check_interval)
                await self._check_memory_usage()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Memory monitor error: {e}")
    
    async def _check_memory_usage(self):
        """Check system memory usage and evict models if necessary"""
        async with self.lock:
            current_memory = self._get_total_memory_usage()
            
            if current_memory > self.config.max_memory_usage_mb:
                self.logger.warning(f"Memory usage ({current_memory:.1f}MB) exceeds limit ({self.config.max_memory_usage_mb}MB)")
                await self._evict_models_by_memory()
    
    def _get_total_memory_usage(self) -> float:
        """Get total memory usage of cached models"""
        return sum(entry.memory_usage_mb for entry in self.cache.values())
    
    async def get_model(self, model_name: str) -> BaseModel:
        """Get model from cache, loading if necessary"""
        async with self.lock:
            # Check if model is in cache
            if model_name in self.cache:
                entry = self.cache[model_name]
                entry.touch()
                # Move to end (most recently used)
                self.cache.move_to_end(model_name)
                return entry.model
            
            # Check if model is currently loading
            if model_name in self.loading_models:
                # Wait for loading to complete
                await self._wait_for_loading(model_name)
                return await self.get_model(model_name)  # Recursive call after loading
            
            raise KeyError(f"Model '{model_name}' not found in cache")
    
    async def load_model(self, model_name: str, model: BaseModel) -> None:
        """Load a model into cache"""
        async with self.lock:
            if model_name in self.cache:
                self.logger.info(f"Model {model_name} already in cache")
                return
            
            if model_name in self.loading_models:
                self.logger.info(f"Model {model_name} is already loading")
                return
            
            self.loading_models.add(model_name)
        
        try:
            # Initialize model
            await model.initialize()
            
            # Estimate memory usage
            memory_usage = self._estimate_model_memory(model)
            
            async with self.lock:
                # Check if we need to evict models first
                await self._ensure_cache_space(memory_usage)
                
                # Add to cache
                entry = ModelEntry(
                    model=model,
                    last_accessed=time.time(),
                    access_count=1,
                    memory_usage_mb=memory_usage
                )
                
                self.cache[model_name] = entry
                self.loading_models.discard(model_name)
                
                self.logger.info(f"Model {model_name} loaded into cache ({memory_usage:.1f}MB)")
        
        except Exception as e:
            async with self.lock:
                self.loading_models.discard(model_name)
            self.logger.error(f"Failed to load model {model_name}: {e}")
            raise
    
    async def _wait_for_loading(self, model_name: str):
        """Wait for a model to finish loading"""
        while model_name in self.loading_models:
            await asyncio.sleep(0.1)
    
    async def _ensure_cache_space(self, required_memory: float):
        """Ensure there's enough space in cache for new model"""
        # Check model count limit
        while len(self.cache) >= self.config.max_models_in_memory:
            await self._evict_one_model()
        
        # Check memory limit
        current_memory = self._get_total_memory_usage()
        while current_memory + required_memory > self.config.max_memory_usage_mb:
            await self._evict_one_model()
            current_memory = self._get_total_memory_usage()
    
    async def _evict_one_model(self):
        """Evict one model based on eviction strategy"""
        if not self.cache:
            return
        
        if self.config.cache_eviction_strategy == "lru":
            # Remove least recently used (first item in OrderedDict)
            model_name = next(iter(self.cache))
        elif self.config.cache_eviction_strategy == "lfu":
            # Remove least frequently used
            model_name = min(self.cache.keys(), key=lambda k: self.cache[k].access_count)
        else:  # fifo
            # Remove first in, first out
            model_name = next(iter(self.cache))
        
        await self.evict_model(model_name)
    
    async def _evict_models_by_memory(self):
        """Evict models to reduce memory usage"""
        target_memory = self.config.max_memory_usage_mb * 0.8  # Target 80% of max
        
        while self._get_total_memory_usage() > target_memory and self.cache:
            await self._evict_one_model()
    
    async def evict_model(self, model_name: str):
        """Evict a specific model from cache"""
        if model_name in self.cache:
            entry = self.cache.pop(model_name)
            # Cleanup model resources if needed
            await self._cleanup_model(entry.model)
            self.logger.info(f"Evicted model {model_name} from cache")
    
    async def _cleanup_model(self, model: BaseModel):
        """Cleanup model resources"""
        try:
            # Move model to CPU to free GPU memory
            if hasattr(model, 'model') and hasattr(model.model, 'cpu'):
                model.model.cpu()
            
            # Clear CUDA cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                
        except Exception as e:
            self.logger.warning(f"Error during model cleanup: {e}")
    
    def _estimate_model_memory(self, model: BaseModel) -> float:
        """Estimate model memory usage in MB"""
        try:
            if hasattr(model, 'model') and hasattr(model.model, 'parameters'):
                # PyTorch model
                param_memory = sum(p.numel() * p.element_size() for p in model.model.parameters())
                buffer_memory = sum(b.numel() * b.element_size() for b in model.model.buffers())
                total_bytes = param_memory + buffer_memory
                return total_bytes / (1024 * 1024)  # Convert to MB
            else:
                # Fallback estimation
                return 100.0  # Default 100MB estimate
        except Exception:
            return 100.0  # Default fallback
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "total_models": len(self.cache),
            "max_models": self.config.max_models_in_memory,
            "total_memory_mb": self._get_total_memory_usage(),
            "max_memory_mb": self.config.max_memory_usage_mb,
            "loading_models": len(self.loading_models),
            "models": {
                name: {
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count,
                    "memory_usage_mb": entry.memory_usage_mb,
                    "status": entry.model.status.value
                }
                for name, entry in self.cache.items()
            }
        }
    
    async def clear_cache(self):
        """Clear all models from cache"""
        async with self.lock:
            for model_name in list(self.cache.keys()):
                await self.evict_model(model_name)
    
    async def shutdown(self):
        """Shutdown cache and cleanup resources"""
        if self.memory_monitor_task:
            self.memory_monitor_task.cancel()
            try:
                await self.memory_monitor_task
            except asyncio.CancelledError:
                pass
        
        await self.clear_cache()


class ModelManager:
    """Central model management system"""
    
    def __init__(self, device_manager: DeviceManager, cache_config: Optional[CacheConfig] = None):
        self.device_manager = device_manager
        self.cache_config = cache_config or CacheConfig()
        self.cache = ModelCache(self.cache_config)
        
        # Model registry
        self.model_configs: Dict[str, ModelConfig] = {}
        self.model_loaders: Dict[str, Callable] = {}
        
        # Thread pool for CPU-intensive operations
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ModelManager")
        
        self.logger = logging.getLogger(f"{__name__}.ModelManager")
    
    def register_model(self, 
                      name: str, 
                      config: ModelConfig,
                      loader_func: Optional[Callable] = None):
        """Register a model configuration"""
        self.model_configs[name] = config
        if loader_func:
            self.model_loaders[name] = loader_func
        
        self.logger.info(f"Registered model: {name}")
    
    async def get_model(self, name: str) -> BaseModel:
        """Get a model, loading it if necessary"""
        try:
            return await self.cache.get_model(name)
        except KeyError:
            # Model not in cache, load it
            await self.load_model(name)
            return await self.cache.get_model(name)
    
    async def load_model(self, name: str) -> None:
        """Load a model into cache"""
        if name not in self.model_configs:
            raise ValueError(f"Model '{name}' not registered")
        
        config = self.model_configs[name]
        
        # Select optimal device
        optimal_device = await self.device_manager.get_optimal_device(
            memory_required_mb=200,  # Estimate
            prefer_gpu=True
        )
        config.device = str(optimal_device)
        
        # Create model instance
        if name in self.model_loaders:
            # Use custom loader
            model = await self._create_model_with_loader(name, config)
        else:
            # Use factory
            model = ModelFactory.create_model(config)
        
        # Load into cache
        await self.cache.load_model(name, model)
    
    async def _create_model_with_loader(self, name: str, config: ModelConfig) -> BaseModel:
        """Create model using custom loader function"""
        loader_func = self.model_loaders[name]
        
        # Run loader in thread pool if it's CPU intensive
        loop = asyncio.get_event_loop()
        model = await loop.run_in_executor(self.executor, loader_func, config)
        
        return model
    
    async def preload_models(self, model_names: List[str]):
        """Preload multiple models"""
        self.logger.info(f"Preloading {len(model_names)} models")
        
        # Load models concurrently
        tasks = [self.load_model(name) for name in model_names]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log results
        for name, result in zip(model_names, results):
            if isinstance(result, Exception):
                self.logger.error(f"Failed to preload model {name}: {result}")
            else:
                self.logger.info(f"Successfully preloaded model {name}")
    
    async def warmup_models(self, model_names: Optional[List[str]] = None):
        """Warm up models with dummy inputs"""
        if model_names is None:
            model_names = list(self.model_configs.keys())
        
        for name in model_names:
            try:
                model = await self.get_model(name)
                if model.config.warmup_iterations > 0:
                    self.logger.info(f"Warming up model {name}")
                    await model._warmup()
            except Exception as e:
                self.logger.error(f"Failed to warm up model {name}: {e}")
    
    def list_models(self) -> List[str]:
        """List all registered models"""
        return list(self.model_configs.keys())
    
    def get_model_info(self, name: str) -> Dict[str, Any]:
        """Get information about a model"""
        if name not in self.model_configs:
            raise ValueError(f"Model '{name}' not registered")
        
        config = self.model_configs[name]
        info = {
            "name": name,
            "type": config.model_type.value,
            "format": config.model_format.value,
            "device": config.device,
            "model_path": config.model_path,
            "batch_size": config.batch_size,
            "confidence_threshold": config.confidence_threshold
        }
        
        # Add runtime info if model is loaded
        try:
            # Don't await here to avoid blocking
            cache_entry = self.cache.cache.get(name)
            if cache_entry:
                info.update({
                    "status": cache_entry.model.status.value,
                    "last_accessed": cache_entry.last_accessed,
                    "access_count": cache_entry.access_count,
                    "memory_usage_mb": cache_entry.memory_usage_mb
                })
        except Exception:
            pass
        
        return info
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get system statistics"""
        return {
            "device_manager": self.device_manager.get_device_info(),
            "model_cache": self.cache.get_cache_stats(),
            "registered_models": len(self.model_configs),
            "system_memory": {
                "total_mb": psutil.virtual_memory().total / (1024 * 1024),
                "available_mb": psutil.virtual_memory().available / (1024 * 1024),
                "used_mb": psutil.virtual_memory().used / (1024 * 1024)
            }
        }
    
    async def evict_model(self, name: str):
        """Evict a model from cache"""
        await self.cache.evict_model(name)
    
    async def clear_cache(self):
        """Clear all models from cache"""
        await self.cache.clear_cache()
    
    async def shutdown(self):
        """Shutdown model manager"""
        self.logger.info("Shutting down model manager")
        
        # Shutdown cache
        await self.cache.shutdown()
        
        # Shutdown thread pool
        self.executor.shutdown(wait=True)
        
        self.logger.info("Model manager shutdown complete")