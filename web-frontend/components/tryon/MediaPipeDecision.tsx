// components/tryon/MediaPipeDecision.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Download
} from 'lucide-react';

interface DecisionData {
  decision: 'GO' | 'NO-GO';
  successRate: number;
  testResults: {
    scenario: string;
    passed: boolean;
    confidence: number;
  }[];
  timestamp: string;
  reasoning: string;
}

interface MediaPipeDecisionProps {
  decision: 'GO' | 'NO-GO' | null;
  successRate: number;
  testResults: Array<{ name: string; passed: boolean; confidence: number }>;
}

export function MediaPipeDecision({ decision, successRate, testResults }: MediaPipeDecisionProps) {
  const [reasoning, setReasoning] = useState('');
  const [documented, setDocumented] = useState(false);

  if (!decision) return null;

  const handleDocumentDecision = () => {
    const decisionData: DecisionData = {
      decision,
      successRate,
      testResults: testResults.map(t => ({
        scenario: t.name,
        passed: t.passed,
        confidence: t.confidence
      })),
      timestamp: new Date().toISOString(),
      reasoning: reasoning || (
        decision === 'GO'
          ? 'Success rate meets 60% threshold. MediaPipe accuracy acceptable for hybrid mode.'
          : 'Success rate below 60% threshold. Focusing on manual-only approach with polished controls.'
      )
    };

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(decisionData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mediapipe-decision-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setDocumented(true);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Day 4 Evening: GO/NO-GO Decision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Decision Badge */}
        <div className="flex items-center justify-center p-6 rounded-lg border-2 bg-card">
          {decision === 'GO' ? (
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <Badge className="bg-green-500 text-lg px-6 py-2">
                GO: Proceed with MediaPipe
              </Badge>
              <p className="text-sm text-muted-foreground mt-3">
                Success rate: <strong className="text-green-500">{successRate.toFixed(1)}%</strong> ≥ 60%
              </p>
            </div>
          ) : (
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <Badge variant="destructive" className="text-lg px-6 py-2">
                NO-GO: Manual-Only Mode
              </Badge>
              <p className="text-sm text-muted-foreground mt-3">
                Success rate: <strong className="text-red-500">{successRate.toFixed(1)}%</strong> &lt; 60%
              </p>
            </div>
          )}
        </div>

        {/* Test Summary */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Test Results Summary</div>
          <div className="grid grid-cols-2 gap-2">
            {testResults.map((result, index) => (
              <div key={index} className="p-2 rounded border bg-card text-xs">
                <div className="flex items-center justify-between">
                  <span className="truncate">{result.name}</span>
                  {result.passed ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-muted-foreground mt-1">
                  {(result.confidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Reasoning */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Decision Reasoning <span className="text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder={
              decision === 'GO'
                ? 'E.g., MediaPipe accuracy acceptable in most conditions. Will implement hybrid mode with manual override for edge cases.'
                : 'E.g., Low accuracy in varied lighting. Manual system provides better user control and reliability for 2-week timeline.'
            }
            rows={4}
            disabled={documented}
          />
        </div>

        {/* Next Steps */}
        <div className="p-3 rounded-lg bg-muted space-y-2">
          <div className="text-sm font-medium">
            {decision === 'GO' ? '✅ Next Steps (Day 5):' : '✅ Next Steps (Day 5-7):'}
          </div>
          <ul className="text-xs text-muted-foreground list-disc ml-4 space-y-1">
            {decision === 'GO' ? (
              <>
                <li>Calculate shirt position from shoulder landmarks (#11, #12)</li>
                <li>Add &quot;Auto-Align&quot; button for automatic positioning</li>
                <li>Implement hybrid mode (auto initial + manual adjustment)</li>
                <li>Add fallback to manual if no pose detected</li>
              </>
            ) : (
              <>
                <li>Disable MediaPipe to reduce complexity</li>
                <li>Add rotation controls to manual system</li>
                <li>Improve UI with better visual feedback</li>
                <li>Focus testing on manual placement accuracy</li>
                <li>Polish transform controls and interaction</li>
              </>
            )}
          </ul>
        </div>

        {/* Document Button */}
        <Button
          onClick={handleDocumentDecision}
          disabled={documented}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {documented ? 'Decision Documented' : 'Download Decision Report'}
        </Button>

        {documented && (
          <p className="text-xs text-center text-muted-foreground">
            Decision report saved. Include this in your project documentation.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
