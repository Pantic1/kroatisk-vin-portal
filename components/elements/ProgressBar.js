'use client'
import { useEffect } from 'react';

const ProgressBar = () => {
  useEffect(() => {
    const updateProgress = () => {
      const bars = document.querySelectorAll('.progress-level-bar > span');
      bars.forEach((bar) => {
        const t1 = parseFloat(bar.dataset.progress);
        const t2 = parseFloat(bar.dataset.max);
        const getWidth = (t1 / t2) * 100;
        bar.style.width = getWidth + '%';
      });
    };

    const intervalId = setInterval(updateProgress, 500);

    return () => clearInterval(intervalId);
  }, []);

  return null; // or return any JSX you want to render alongside the progress bars
};

export default ProgressBar;
