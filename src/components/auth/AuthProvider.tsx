
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string;
  roleLoading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('student');
  const [roleLoading, setRoleLoading] = useState(true);

  const fetchUserRole = async (userId: string, isTempUser: boolean = false) => {
    if (isTempUser) {
      setRole('student');
      setRoleLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('student');
      } else {
        setRole(data?.role || 'student');
      }
    } catch (error) {
      console.error('Exception fetching user role:', error);
      setRole('student');
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener');
    
    // Get initial session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email || 'no session');
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        const isTempUser = session.user.user_metadata?.is_temp_user || false;
        fetchUserRole(session.user.id, isTempUser);
      } else {
        setRole('student');
        setRoleLoading(false);
      }
    });

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user');
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const isTempUser = session.user.user_metadata?.is_temp_user || false;
          setRoleLoading(true);
          fetchUserRole(session.user.id, isTempUser);
        } else {
          setRole('student');
          setRoleLoading(false);
        }
      }
    );

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      console.log('Attempting signup for:', email);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      console.log('Signup response:', { data: data?.user?.email, error: error?.message });
      setLoading(false);
      return { error };
    } catch (err) {
      console.error('Signup error:', err);
      setLoading(false);
      return { error: err };
    }
  };

  const signIn = async (emailOrUsername: string, password: string) => {
    try {
      console.log('Attempting signin for:', emailOrUsername);
      setLoading(true);
      
      // Detectar si es email o username
      const isEmail = emailOrUsername.includes('@');
      
      if (isEmail) {
        // Flujo normal de Supabase Auth para emails
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrUsername,
          password
        });
        
        console.log('Email signin response:', { 
          success: !error, 
          user: data?.user?.email,
          error: error?.message 
        });
        
        setLoading(false);
        return { error };
      } else {
        // Flujo de credenciales de examen para usernames
        console.log('Username detected, checking exam credentials...');
        
        // Buscar credenciales activas
        const { data: credentialData, error: credError } = await supabase
          .from('exam_credentials')
          .select('*')
          .eq('username', emailOrUsername)
          .eq('is_used', false)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .single();

        if (credError || !credentialData) {
          console.log('No valid exam credentials found:', credError);
          setLoading(false);
          return { error: { message: 'Credenciales de usuario inválidas o expiradas' } };
        }

        // Verificar contraseña - limpiar espacios y caracteres especiales
        const storedPassword = (credentialData.password_hash || '').toString().replace(/\s/g, '');
        const enteredPassword = (password || '').toString().replace(/\s/g, '');
        
        console.log('🔒 Password verification:', {
          storedOriginal: credentialData.password_hash,
          enteredOriginal: password,
          storedCleaned: storedPassword,
          enteredCleaned: enteredPassword,
          match: storedPassword === enteredPassword
        });

        if (storedPassword !== enteredPassword) {
          console.log('Invalid password for username');
          setLoading(false);
          return { error: { message: 'Credenciales de usuario inválidas o expiradas' } };
        }

        // Buscar el usuario por email para obtener su perfil completo
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', credentialData.user_email)
          .single();

        if (userError || !userData) {
          console.log('User profile not found:', userError);
          setLoading(false);
          return { error: { message: 'Perfil de usuario no encontrado' } };
        }

        // Verificar acceso
        if (userData.access_restricted || !userData.can_login) {
          console.log('User access restricted');
          setLoading(false);
          return { error: { message: 'Acceso restringido' } };
        }

        // Crear sesión simulada para el usuario temporal
        const mockUser = {
          id: userData.id,
          email: userData.email,
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          confirmation_sent_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {
            provider: 'credentials',
            providers: ['credentials']
          },
          user_metadata: {
            full_name: userData.full_name,
            is_temp_user: true,
            username: emailOrUsername
          },
          identities: [],
          created_at: userData.created_at,
          updated_at: new Date().toISOString()
        } as unknown as User;

        const mockSession = {
          access_token: 'temp_token_' + Date.now(),
          refresh_token: 'temp_refresh_' + Date.now(),
          user: mockUser,
          expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 horas
          expires_in: 24 * 60 * 60,
          token_type: 'bearer'
        } as Session;

        console.log('Username signin successful, creating temp session');
        setSession(mockSession);
        setUser(mockUser);
        setLoading(false);
        return { error: null };
      }
    } catch (err) {
      console.error('Signin error:', err);
      setLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      console.log('Attempting signout');
      setLoading(true);
      
      // Si es usuario temporal, solo limpiar el estado local
      if (user?.user_metadata?.is_temp_user) {
        console.log('Signing out temp user, clearing local state');
        setSession(null);
        setUser(null);
      } else {
        // Si es usuario regular, usar signOut normal de Supabase
        await supabase.auth.signOut();
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Signout error:', err);
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Attempting password reset for:', email);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`
      });
      console.log('Password reset response:', { error: error?.message });
      return { error };
    } catch (err) {
      console.error('Password reset error:', err);
      return { error: err };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    role,
    roleLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
