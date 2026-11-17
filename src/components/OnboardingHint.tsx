import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const OnboardingHint: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none flex justify-center px-4"
        >
          <div className="toy-pill pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-[#5c504b]">
            <Keyboard className="h-3.5 w-3.5 text-[#cf5e4a]" strokeWidth={1.75} />
            <span>
              Type on your keyboard, drag the slider, click any layer to isolate, or hover a switch
            </span>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Dismiss hint"
              className="ml-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full hover:bg-[#efe6da]"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
