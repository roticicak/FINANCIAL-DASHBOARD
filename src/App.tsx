import React, { useState } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { FinanceProvider } from './context/FinanceContext';
import { ActiveTab } from './types/finance';
import { FloatingHeader } from './components/layout/FloatingHeader';
import { OverviewView } from './components/views/OverviewView';
import { CashFlowView } from './components/views/CashFlowView';
import { InvestmentsView } from './components/views/InvestmentsView';
import { PnLView } from './components/views/PnLView';
import { SummariesView } from './components/views/SummariesView';
import { EntryModal } from './components/modals/EntryModal';
import { ToastContainer } from './components/ui/ToastContainer';

const pageTransition = {
  initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)' },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const },
};

const DashboardShell: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  return (
    <div className="finance-canvas min-h-screen text-slate-900 pb-16">
      <FloatingHeader activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 sm:pt-8">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} {...pageTransition}>
            {activeTab === 'overview' && (
              <OverviewView onNavigate={setActiveTab} />
            )}
            {activeTab === 'cashflow' && <CashFlowView />}
            {activeTab === 'investments' && <InvestmentsView />}
            {activeTab === 'pnl' && <PnLView />}
            {activeTab === 'summaries' && <SummariesView />}
          </motion.div>
        </AnimatePresence>
      </main>

      <EntryModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <FinanceProvider>
        <DashboardShell />
      </FinanceProvider>
    </MotionConfig>
  );
}

export default App;
