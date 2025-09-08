import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useProfileRole() {
  const [role, setRole] = useState<'user' | 'admin' | 'unknown'>('unknown');
  const [email, setEmail] = useState<string>('');
  useEffect(() => {
    let mounted = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) {
          setRole('unknown');
          setEmail('');
        }
        return;
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', user.id)
        .single();
      if (!error && data && mounted) {
        setRole((data.role as any) ?? 'user');
        setEmail(data.email || '');
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return { role, email };
}
