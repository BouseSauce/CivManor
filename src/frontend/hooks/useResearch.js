import { useState, useEffect } from 'react';
import { GameClient } from '../api/client';

export function useResearch() {
  const [research, setResearch] = useState({ active: null, researched: [] });
  const [loading, setLoading] = useState(true);

  const fetchResearch = async () => {
    try {
      const data = await GameClient.getResearch();
      setResearch(data);
    } catch (e) {
      console.error('Failed to fetch research:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearch();
    const id = setInterval(fetchResearch, 3000);
    return () => clearInterval(id);
  }, []);

  return { research, refreshResearch: fetchResearch, loading };
}
