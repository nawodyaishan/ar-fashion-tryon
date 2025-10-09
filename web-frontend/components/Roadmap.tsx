import { Check, Clock, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { roadmapItems } from '@/lib/constants';

export function Roadmap() {
  const doneCount = roadmapItems.filter(item => item.status === 'done').length;
  const totalCount = roadmapItems.length;
  const progressPercent = (doneCount / totalCount) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto border-2">
      <CardHeader>
        <CardTitle>Roadmap</CardTitle>
        <CardDescription>Our journey to build the best try-on experience</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">{doneCount}/{totalCount}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="space-y-3">
          {roadmapItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex-shrink-0">
                {item.status === 'done' && (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                )}
                {item.status === 'in-progress' && (
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                {item.status === 'planned' && (
                  <div className="w-6 h-6 rounded-full bg-slate-500/20 flex items-center justify-center">
                    <Circle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </div>
                )}
              </div>
              <div className="flex-grow">
                <p className="text-sm font-medium">{item.label}</p>
              </div>
              <div className="flex-shrink-0">
                {item.status === 'done' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-700 dark:text-green-400 font-medium">
                    Done
                  </span>
                )}
                {item.status === 'in-progress' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium">
                    In Progress
                  </span>
                )}
                {item.status === 'planned' && (
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-400 font-medium">
                    Planned
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
