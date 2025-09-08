import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useProfileRole() {
  const [role, setRole] = useState<'user' | 'admin' | 'unknown'>('unknown');
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) {
          setRole('unknown');
        }
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!error && data && mounted) {
        setRole((data.role as any) ?? 'user');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return role;
}
