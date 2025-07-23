"""
GPU/CPU Device Management System

This module provides intelligent device management for optimal resource allocation
across multiple ML models in the AR Fashion Try-On system.
"""

from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import logging
import asyncio
import time
import threading
from concurrent.futures import ThreadPoolExecutor
import psutil
import torch
import subprocess
import platform

logger = logging.getLogger(__name__)


class DeviceType(str, Enum):
    """Supported device types"""
    CPU = "cpu"
    CUDA = "cuda"
    MPS = "mps"  # Apple Metal Performance Shaders
    UNKNOWN = "unknown"


@dataclass
class DeviceInfo:
    """Information about a compute device"""
    device_id: str
    device_type: DeviceType
    name: str
    total_memory_mb: float
    available_memory_mb: float
    used_memory_mb: float
    utilization_percent: float
    temperature_c: Optional[float] = None
    power_usage_w: Optional[float] = None
    compute_capability: Optional[Tuple[int, int]] = None  # For CUDA devices
    is_available: bool = True
    
    @property
    def memory_usage_percent(self) -> float:
        """Calculate memory usage percentage"""
        if self.total_memory_mb > 0:
            return (self.used_memory_mb / self.total_memory_mb) * 100
        return 0.0
    
    @property
    def free_memory_mb(self) -> float:
        """Get free memory in MB"""
        return self.total_memory_mb - self.used_memory_mb
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "device_id": self.device_id,
            "device_type": self.device_type.value,
            "name": self.name,
            "total_memory_mb": self.total_memory_mb,
            "available_memory_mb": self.available_memory_mb,
            "used_memory_mb": self.used_memory_mb,
            "utilization_percent": self.utilization_percent,
            "memory_usage_percent": self.memory_usage_percent,
            "temperature_c": self.temperature_c,
            "power_usage_w": self.power_usage_w,
            "compute_capability": self.compute_capability,
            "is_available": self.is_available
        }


@dataclass
class DeviceAllocation:
    """Track device resource allocation"""
    device_id: str
    allocated_memory_mb: float = 0.0
    allocated_models: List[str] = field(default_factory=list)
    last_used: float = field(default_factory=time.time)
    
    def allocate(self, model_name: str, memory_mb: float):
        """Allocate resources for a model"""
        self.allocated_models.append(model_name)
        self.allocated_memory_mb += memory_mb
        self.last_used = time.time()
    
    def deallocate(self, model_name: str, memory_mb: float):
        """Deallocate resources for a model"""
        if model_name in self.allocated_models:
            self.allocated_models.remove(model_name)
            self.allocated_memory_mb = max(0, self.allocated_memory_mb - memory_mb)


class DeviceMonitor:
    """Monitors device status and performance"""
    
    def __init__(self, update_interval: float = 5.0):
        self.update_interval = update_interval
        self.devices: Dict[str, DeviceInfo] = {}
        self.monitor_task: Optional[asyncio.Task] = None
        self.lock = asyncio.Lock()
        self.logger = logging.getLogger(f"{__name__}.DeviceMonitor")
        
        # Initialize devices
        asyncio.create_task(self._initialize_devices())
    
    async def _initialize_devices(self):
        """Initialize device discovery"""
        await self._discover_devices()
        self.monitor_task = asyncio.create_task(self._monitor_loop())
    
    async def _discover_devices(self):
        """Discover available compute devices"""
        async with self.lock:
            self.devices.clear()
            
            # Add CPU
            cpu_info = await self._get_cpu_info()
            self.devices["cpu"] = cpu_info
            
            # Add CUDA devices
            if torch.cuda.is_available():
                for i in range(torch.cuda.device_count()):
                    cuda_info = await self._get_cuda_info(i)
                    self.devices[f"cuda:{i}"] = cuda_info
            
            # Add MPS device (Apple Silicon)
            if torch.backends.mps.is_available():
                mps_info = await self._get_mps_info()
                self.devices["mps"] = mps_info
    
    async def _monitor_loop(self):
        """Background monitoring loop"""
        while True:
            try:
                await asyncio.sleep(self.update_interval)
                await self._update_device_stats()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Device monitoring error: {e}")
    
    async def _update_device_stats(self):
        """Update device statistics"""
        async with self.lock:
            for device_id in list(self.devices.keys()):
                try:
                    if device_id == "cpu":
                        updated_info = await self._get_cpu_info()
                    elif device_id.startswith("cuda:"):
                        gpu_idx = int(device_id.split(":")[1])
                        updated_info = await self._get_cuda_info(gpu_idx)
                    elif device_id == "mps":
                        updated_info = await self._get_mps_info()
                    else:
                        continue
                    
                    self.devices[device_id] = updated_info
                    
                except Exception as e:
                    self.logger.warning(f"Failed to update stats for {device_id}: {e}")
                    self.devices[device_id].is_available = False
    
    async def _get_cpu_info(self) -> DeviceInfo:
        """Get CPU device information"""
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Get CPU temperature if available
        temperature = None
        try:
            if hasattr(psutil, "sensors_temperatures"):
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        if entries and hasattr(entries[0], 'current'):
                            temperature = entries[0].current
                            break
        except Exception:
            pass
        
        return DeviceInfo(
            device_id="cpu",
            device_type=DeviceType.CPU,
            name=f"{platform.processor()} ({psutil.cpu_count()} cores)",
            total_memory_mb=memory.total / (1024 * 1024),
            available_memory_mb=memory.available / (1024 * 1024),
            used_memory_mb=memory.used / (1024 * 1024),
            utilization_percent=cpu_percent,
            temperature_c=temperature
        )
    
    async def _get_cuda_info(self, device_idx: int) -> DeviceInfo:
        """Get CUDA device information"""
        device = torch.device(f"cuda:{device_idx}")
        props = torch.cuda.get_device_properties(device)
        
        # Memory info
        total_memory = torch.cuda.get_device_properties(device).total_memory
        reserved_memory = torch.cuda.memory_reserved(device)
        allocated_memory = torch.cuda.memory_allocated(device)
        
        # Get GPU utilization using nvidia-ml-py if available
        utilization = 0.0
        temperature = None
        power_usage = None
        
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(device_idx)
            
            # Utilization
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            utilization = util.gpu
            
            # Temperature
            temperature = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            
            # Power usage
            try:
                power_usage = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0  # Convert to watts
            except:
                pass
                
        except ImportError:
            self.logger.debug("pynvml not available, using basic CUDA info")
        except Exception as e:
            self.logger.debug(f"Error getting NVIDIA-ML info: {e}")
        
        return DeviceInfo(
            device_id=f"cuda:{device_idx}",
            device_type=DeviceType.CUDA,
            name=props.name,
            total_memory_mb=total_memory / (1024 * 1024),
            available_memory_mb=(total_memory - reserved_memory) / (1024 * 1024),
            used_memory_mb=allocated_memory / (1024 * 1024),
            utilization_percent=utilization,
            temperature_c=temperature,
            power_usage_w=power_usage,
            compute_capability=(props.major, props.minor)
        )
    
    async def _get_mps_info(self) -> DeviceInfo:
        """Get MPS (Apple Metal) device information"""
        # MPS doesn't provide detailed memory info, so we estimate
        return DeviceInfo(
            device_id="mps",
            device_type=DeviceType.MPS,
            name="Apple Metal Performance Shaders",
            total_memory_mb=8192.0,  # Estimate - varies by device
            available_memory_mb=6144.0,  # Estimate
            used_memory_mb=2048.0,  # Estimate
            utilization_percent=0.0  # Not available
        )
    
    async def get_device_info(self, device_id: str) -> Optional[DeviceInfo]:
        """Get information for a specific device"""
        async with self.lock:
            return self.devices.get(device_id)
    
    async def get_all_devices(self) -> Dict[str, DeviceInfo]:
        """Get information for all devices"""
        async with self.lock:
            return self.devices.copy()
    
    async def get_available_devices(self) -> Dict[str, DeviceInfo]:
        """Get only available devices"""
        async with self.lock:
            return {k: v for k, v in self.devices.items() if v.is_available}
    
    async def shutdown(self):
        """Shutdown device monitor"""
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass


class DeviceManager:
    """Intelligent device management and allocation"""
    
    def __init__(self, prefer_gpu: bool = True, memory_reserve_mb: float = 512.0):
        self.prefer_gpu = prefer_gpu
        self.memory_reserve_mb = memory_reserve_mb
        self.monitor = DeviceMonitor()
        self.allocations: Dict[str, DeviceAllocation] = {}
        self.lock = asyncio.Lock()
        self.logger = logging.getLogger(f"{__name__}.DeviceManager")
    
    async def get_optimal_device(self, 
                               memory_required_mb: float = 0,
                               prefer_gpu: Optional[bool] = None,
                               exclude_devices: Optional[List[str]] = None) -> torch.device:
        """Select the optimal device based on requirements and current load"""
        
        if prefer_gpu is None:
            prefer_gpu = self.prefer_gpu
        
        exclude_devices = exclude_devices or []
        
        async with self.lock:
            devices = await self.monitor.get_available_devices()
            
            # Filter out excluded devices
            devices = {k: v for k, v in devices.items() if k not in exclude_devices}
            
            if not devices:
                self.logger.warning("No available devices found, falling back to CPU")
                return torch.device("cpu")
            
            # Score devices based on suitability
            device_scores = []
            
            for device_id, device_info in devices.items():
                score = self._calculate_device_score(
                    device_info, 
                    memory_required_mb, 
                    prefer_gpu
                )
                device_scores.append((device_id, device_info, score))
            
            # Sort by score (higher is better)
            device_scores.sort(key=lambda x: x[2], reverse=True)
            
            # Select best device
            best_device_id, best_device_info, best_score = device_scores[0]
            
            self.logger.info(f"Selected device {best_device_id} (score: {best_score:.2f})")
            
            return torch.device(best_device_id)
    
    def _calculate_device_score(self, 
                              device_info: DeviceInfo, 
                              memory_required_mb: float,
                              prefer_gpu: bool) -> float:
        """Calculate suitability score for a device"""
        score = 0.0
        
        # Base score by device type
        if device_info.device_type == DeviceType.CUDA:
            score += 100.0 if prefer_gpu else 50.0
        elif device_info.device_type == DeviceType.MPS:
            score += 80.0 if prefer_gpu else 40.0
        elif device_info.device_type == DeviceType.CPU:
            score += 30.0 if not prefer_gpu else 10.0
        
        # Memory availability score
        available_memory = device_info.free_memory_mb - self.memory_reserve_mb
        if available_memory >= memory_required_mb:
            memory_ratio = available_memory / max(device_info.total_memory_mb, 1)
            score += memory_ratio * 50.0  # Up to 50 points for memory
        else:
            # Penalize insufficient memory heavily
            score -= 1000.0
        
        # Utilization score (lower utilization is better)
        utilization_penalty = device_info.utilization_percent * 0.5
        score -= utilization_penalty
        
        # Temperature penalty (if available)
        if device_info.temperature_c is not None:
            if device_info.temperature_c > 80:  # Hot GPU
                score -= 20.0
            elif device_info.temperature_c > 90:  # Very hot GPU
                score -= 50.0
        
        # Current allocation penalty
        allocation = self.allocations.get(device_info.device_id)
        if allocation:
            allocation_penalty = len(allocation.allocated_models) * 5.0
            score -= allocation_penalty
        
        return max(score, 0.0)  # Ensure non-negative score
    
    async def allocate_device(self, 
                            device_id: str, 
                            model_name: str, 
                            memory_mb: float) -> bool:
        """Allocate device resources for a model"""
        async with self.lock:
            device_info = await self.monitor.get_device_info(device_id)
            
            if not device_info or not device_info.is_available:
                return False
            
            # Check if we have enough memory
            if device_id not in self.allocations:
                self.allocations[device_id] = DeviceAllocation(device_id)
            
            allocation = self.allocations[device_id]
            required_memory = memory_mb + self.memory_reserve_mb
            available_memory = device_info.free_memory_mb - allocation.allocated_memory_mb
            
            if available_memory < required_memory:
                self.logger.warning(f"Insufficient memory on {device_id}: {available_memory:.1f}MB available, {required_memory:.1f}MB required")
                return False
            
            # Allocate resources
            allocation.allocate(model_name, memory_mb)
            
            self.logger.info(f"Allocated {memory_mb:.1f}MB on {device_id} for {model_name}")
            return True
    
    async def deallocate_device(self, device_id: str, model_name: str, memory_mb: float):
        """Deallocate device resources for a model"""
        async with self.lock:
            if device_id in self.allocations:
                self.allocations[device_id].deallocate(model_name, memory_mb)
                self.logger.info(f"Deallocated {memory_mb:.1f}MB on {device_id} for {model_name}")
    
    async def get_device_allocations(self) -> Dict[str, DeviceAllocation]:
        """Get current device allocations"""
        async with self.lock:
            return self.allocations.copy()
    
    def get_device_info(self) -> Dict[str, Any]:
        """Get device manager information"""
        return {
            "prefer_gpu": self.prefer_gpu,
            "memory_reserve_mb": self.memory_reserve_mb,
            "torch_cuda_available": torch.cuda.is_available(),
            "torch_mps_available": torch.backends.mps.is_available() if hasattr(torch.backends, 'mps') else False,
            "cuda_device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0
        }
    
    async def optimize_device_usage(self):
        """Optimize device usage by rebalancing allocations"""
        async with self.lock:
            devices = await self.monitor.get_available_devices()
            
            # Find overloaded devices
            overloaded_devices = []
            underutilized_devices = []
            
            for device_id, device_info in devices.items():
                if device_info.utilization_percent > 90:
                    overloaded_devices.append(device_id)
                elif device_info.utilization_percent < 30:
                    underutilized_devices.append(device_id)
            
            if overloaded_devices and underutilized_devices:
                self.logger.info(f"Found {len(overloaded_devices)} overloaded and {len(underutilized_devices)} underutilized devices")
                # Could implement model migration logic here
    
    async def shutdown(self):
        """Shutdown device manager"""
        self.logger.info("Shutting down device manager")
        await self.monitor.shutdown()
        
        # Clear allocations
        async with self.lock:
            self.allocations.clear()


# Global device manager instance
device_manager: Optional[DeviceManager] = None


def get_device_manager() -> DeviceManager:
    """Get the global device manager instance"""
    global device_manager
    if device_manager is None:
        device_manager = DeviceManager()
    return device_manager


async def initialize_device_manager(**kwargs) -> DeviceManager:
    """Initialize the global device manager"""
    global device_manager
    device_manager = DeviceManager(**kwargs)
    return device_manager