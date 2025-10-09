// components/tryon/MediaPipeTestPanel.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { useTryonStore } from '@/lib/tryon-store';
import { MediaPipeDecision } from './MediaPipeDecision';

interface TestScenario {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  minConfidence: number;
  tested: boolean;
  passed: boolean;
  confidence: number;
}

export function MediaPipeTestPanel() {
  const { poseConfidence, mediaPipeEnabled } = useTryonStore();
  const [scenarios, setScenarios] = useState<TestScenario[]>([
    {
      id: 'person-1-bright',
      name: 'Person 1 - Bright Light',
      icon: <Sun className="h-4 w-4" />,
      description: 'Frontal pose, good lighting',
      minConfidence: 0.6,
      tested: false,
      passed: false,
      confidence: 0
    },
    {
      id: 'person-1-dim',
      name: 'Person 1 - Dim Light',
      icon: <Moon className="h-4 w-4" />,
      description: 'Frontal pose, low lighting',
      minConfidence: 0.5,
      tested: false,
      passed: false,
      confidence: 0
    },
    {
      id: 'person-2-bright',
      name: 'Person 2 - Bright Light',
      icon: <User className="h-4 w-4" />,
      description: 'Different body type, good lighting',
      minConfidence: 0.6,
      tested: false,
      passed: false,
      confidence: 0
    },
    {
      id: 'person-2-dim',
      name: 'Person 2 - Dim Light',
      icon: <User className="h-4 w-4" />,
      description: 'Different body type, low lighting',
      minConfidence: 0.5,
      tested: false,
      passed: false,
      confidence: 0
    },
    {
      id: 'person-3-bright',
      name: 'Person 3 - Bright Light',
      icon: <User className="h-4 w-4" />,
      description: 'Third person, good lighting',
      minConfidence: 0.6,
      tested: false,
      passed: false,
      confidence: 0
    },
    {
      id: 'person-3-dim',
      name: 'Person 3 - Dim Light',
      icon: <User className="h-4 w-4" />,
      description: 'Third person, low lighting',
      minConfidence: 0.5,
      tested: false,
      passed: false,
      confidence: 0
    }
  ]);

  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testDuration, setTestDuration] = useState(0);

  // Convert PoseConfidence string to number
  const getConfidenceValue = (): number => {
    if (poseConfidence === 'Good') return 0.8;
    if (poseConfidence === 'Okay') return 0.6;
    return 0.4;
  };

  // Record test result
  const recordTest = (scenarioId: string) => {
    if (!mediaPipeEnabled) {
      alert('Please enable MediaPipe first');
      return;
    }

    setCurrentTest(scenarioId);
    setTestDuration(0);

    // Collect samples over 3 seconds
    const samples: number[] = [];
    const interval = setInterval(() => {
      const confValue = getConfidenceValue();
      if (confValue > 0) {
        samples.push(confValue);
      }
    }, 100); // Sample every 100ms

    // Stop after 3 seconds
    setTimeout(() => {
      clearInterval(interval);

      if (samples.length === 0) {
        alert('No pose detected! Please ensure you are visible in the camera.');
        setCurrentTest(null);
        return;
      }

      // Calculate average confidence
      const avgConfidence = samples.reduce((a, b) => a + b, 0) / samples.length;

      setScenarios(prev => prev.map(s => {
        if (s.id === scenarioId) {
          return {
            ...s,
            tested: true,
            confidence: avgConfidence,
            passed: avgConfidence >= s.minConfidence
          };
        }
        return s;
      }));

      setCurrentTest(null);
    }, 3000);
  };

  // Timer for current test
  useEffect(() => {
    if (!currentTest) return;

    const interval = setInterval(() => {
      setTestDuration(prev => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [currentTest]);

  // Calculate overall statistics
  const testedCount = scenarios.filter(s => s.tested).length;
  const passedCount = scenarios.filter(s => s.passed).length;
  const totalCount = scenarios.length;
  const successRate = testedCount > 0 ? (passedCount / testedCount) * 100 : 0;

  const overallDecision = () => {
    if (testedCount < totalCount) return null;
    if (successRate >= 60) return 'GO';
    return 'NO-GO';
  };

  const decision = overallDecision();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm">MediaPipe Accuracy Testing</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Test with 3 different people in various lighting conditions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span>Overall Progress</span>
            <span className="font-medium">{testedCount}/{totalCount} tests</span>
          </div>
          <Progress value={(testedCount / totalCount) * 100} />

          {testedCount > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span>Success Rate</span>
              <span className={`font-medium ${
                successRate >= 60 ? 'text-green-500' : 'text-red-500'
              }`}>
                {successRate.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Test Scenarios */}
        <div className="space-y-2">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="text-muted-foreground">
                  {scenario.icon}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{scenario.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {scenario.description}
                  </div>
                  {scenario.tested && (
                    <div className="text-xs mt-1">
                      Confidence: {(scenario.confidence * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {scenario.tested ? (
                  scenario.passed ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Pass
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Fail
                    </Badge>
                  )
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => recordTest(scenario.id)}
                    disabled={!!currentTest}
                  >
                    {currentTest === scenario.id ? (
                      <>Testing... {Math.floor(testDuration / 1000)}s</>
                    ) : (
                      'Test'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Decision Panel */}
        {decision && (
          <div className={`p-4 rounded-lg border-2 ${
            decision === 'GO'
              ? 'bg-green-500/10 border-green-500'
              : 'bg-red-500/10 border-red-500'
          }`}>
            <div className="flex items-center gap-3">
              {decision === 'GO' ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <div className="font-semibold text-green-500">GO: Proceed with MediaPipe</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Success rate {successRate.toFixed(1)}% ≥ 60% threshold. Continue to Day 5 with automatic positioning.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <div className="font-semibold text-red-500">NO-GO: Switch to Manual-Only</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Success rate {successRate.toFixed(1)}% &lt; 60% threshold. Focus on polishing manual placement system.
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Decision Component */}
        {decision && (
          <MediaPipeDecision
            decision={decision}
            successRate={successRate}
            testResults={scenarios.map(s => ({
              name: s.name,
              passed: s.passed,
              confidence: s.confidence
            }))}
          />
        )}

        {/* Instructions */}
        {!decision && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <strong>Testing Instructions:</strong>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li>Test with 3 different people (varying body types)</li>
                <li>Each person tested in bright and dim lighting</li>
                <li>Stand facing camera, arms slightly away from body</li>
                <li>Each test takes 3 seconds to collect samples</li>
                <li>Decision made automatically after all 6 tests</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
