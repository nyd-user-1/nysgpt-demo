import { useNavigate } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from '@/components/ui/drawer';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
} from 'recharts';

// All dashboard cards sorted alphabetically
const DASHBOARD_CARDS: {
  path: string;
  label: string;
  desc: string;
  color: string;
  id: string;
  type: 'area' | 'bar';
  data: { x: number; y: number }[];
}[] = [
  { path: '/charts/budget', label: 'Budget', desc: 'NYS budget spending', color: 'hsl(160 60% 45%)', id: 'drBudget', type: 'area',
    data: [{x:0,y:8},{x:1,y:10},{x:2,y:14},{x:3,y:18},{x:4,y:16},{x:5,y:20},{x:6,y:22},{x:7,y:19},{x:8,y:24},{x:9,y:28}] },
  { path: '/charts/capital', label: 'Capital', desc: 'Capital appropriations', color: 'hsl(217 91% 60%)', id: 'drCapital', type: 'bar',
    data: [{x:0,y:80},{x:1,y:60},{x:2,y:50},{x:3,y:40},{x:4,y:30},{x:5,y:25},{x:6,y:20}] },
  { path: '/charts/contracts', label: 'Contracts', desc: 'State contracts', color: 'hsl(32 95% 50%)', id: 'drContracts', type: 'area',
    data: [{x:0,y:14},{x:1,y:12},{x:2,y:16},{x:3,y:14},{x:4,y:18},{x:5,y:16},{x:6,y:20},{x:7,y:18},{x:8,y:22},{x:9,y:24}] },
  { path: '/charts/discretionary', label: 'Discretionary', desc: 'Discretionary grants', color: 'hsl(280 67% 55%)', id: 'drDiscretionary', type: 'bar',
    data: [{x:0,y:65},{x:1,y:50},{x:2,y:40},{x:3,y:30},{x:4,y:22},{x:5,y:18},{x:6,y:12}] },
  { path: '/charts/lobbying', label: 'Lobbying', desc: 'Lobbyist compensation', color: 'hsl(217 91% 60%)', id: 'drLobby', type: 'area',
    data: [{x:0,y:6},{x:1,y:8},{x:2,y:10},{x:3,y:12},{x:4,y:14},{x:5,y:16},{x:6,y:18},{x:7,y:22},{x:8,y:24},{x:9,y:28}] },
  { path: '/charts/revenue', label: 'Revenue', desc: 'NYS revenue over time', color: 'hsl(160 60% 45%)', id: 'drRevenue', type: 'area',
    data: [{x:0,y:20},{x:1,y:22},{x:2,y:25},{x:3,y:28},{x:4,y:30},{x:5,y:35},{x:6,y:38},{x:7,y:42},{x:8,y:48},{x:9,y:55}] },
  { path: '/charts/votes', label: 'Votes', desc: 'Legislative votes', color: 'hsl(142 76% 36%)', id: 'drVotes', type: 'area',
    data: [{x:0,y:12},{x:1,y:10},{x:2,y:14},{x:3,y:16},{x:4,y:12},{x:5,y:18},{x:6,y:20},{x:7,y:16},{x:8,y:22},{x:9,y:22}] },
];

export function DashboardDrawer() {
  const navigate = useNavigate();

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <LayoutGrid className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboards</span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Dashboards</DrawerTitle>
          <DrawerDescription>Explore NYS data dashboards</DrawerDescription>
        </DrawerHeader>
        <div className="max-h-[60vh] overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {DASHBOARD_CARDS.map((d) => (
            <DrawerClose asChild key={d.path}>
              <button onClick={() => navigate(d.path)} className="text-left rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:shadow-lg transition-all duration-200 overflow-hidden">
                <div className="h-24 px-2 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {d.type === 'area' ? (
                      <AreaChart data={d.data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                        <defs>
                          <linearGradient id={d.id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={d.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={d.color} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="y" stroke={d.color} strokeWidth={1.5} fill={`url(#${d.id})`} dot={false} animationDuration={500} />
                        <XAxis dataKey="x" hide />
                      </AreaChart>
                    ) : (
                      <BarChart data={d.data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                        <Bar dataKey="y" fill={d.color} radius={[2, 2, 0, 0]} animationDuration={500} />
                        <XAxis dataKey="x" hide />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
                <div className="px-3 pb-3 pt-2">
                  <p className="font-semibold text-sm">{d.label}</p>
                  <p className="text-xs text-muted-foreground">{d.desc}</p>
                </div>
              </button>
            </DrawerClose>
          ))}
        </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
