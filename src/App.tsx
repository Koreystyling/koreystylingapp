import { AnimatePresence, motion } from 'framer-motion';
import { StoreProvider } from './lib/store';
import { useRoute, useToast } from './lib/hooks';
import Home from './screens/Home';
import Builder from './screens/Builder';
import Tailor from './screens/Tailor';
import Studio from './screens/Studio';
import Profile from './screens/Profile';

function Routes() {
  const r = useRoute();
  const key = r.slice(0, 2).join('/') || 'home';
  let screen;
  if (r[0] === 'build') screen = <Builder key={r[1] ?? 'new'} lookId={r[1] ?? 'new'} />;
  else if (r[0] === 'tailor') screen = <Tailor lookId={r[1]} />;
  else if (r[0] === 't') screen = <Tailor payload={r[1]} />;
  else if (r[0] === 'profile') screen = <Profile key={r[1] ?? 'me'} ownerKey={r[1] ?? 'me'} />;
  else if (r[0] === 'studio') screen = <Studio tab={(['brand', 'catalogue', 'clients'].includes(r[1]) ? r[1] : 'brand') as 'brand'} />;
  else screen = <Home />;
  return (
    <AnimatePresence mode="wait">
      <motion.div key={r[0] === 'build' ? 'build' : r[0] === 'studio' ? 'studio' : key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
        {screen}
      </motion.div>
    </AnimatePresence>
  );
}

function Toast() {
  const m = useToast();
  return (
    <AnimatePresence>
      {m && <motion.div role="status" className="toast" initial={{ opacity: 0, y: 16, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: 16, x: '-50%' }}>{m}</motion.div>}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Routes />
      <Toast />
    </StoreProvider>
  );
}
