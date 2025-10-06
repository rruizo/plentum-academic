
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Database, Users, BookOpen, Brain } from "lucide-react";

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [testResults, setTestResults] = useState<any>({});
  const [user, setUser] = useState<any>(null);
  const [testData, setTestData] = useState<any>({});
  const [testCredentials, setTestCredentials] = useState({
    email: 'test@example.com',
    password: 'testpassword123',
    fullName: 'Usuario de Prueba',
    company: 'Empresa Test',
    area: 'Área de Pruebas',
    section: 'Sección Test',
    reportContact: 'Jefe de Pruebas'
  });

  useEffect(() => {
    testConnection();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const testConnection = async () => {
    try {
      setConnectionStatus('checking');
      
      // Test 1: Basic connection
      const { data, error } = await supabase.from('question_categories').select('count');
      
      if (error) throw error;
      
      setConnectionStatus('connected');
      
      // Run all tests
      await runAllTests();
      
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus('error');
      setTestResults({ connectionError: error.message });
    }
  };

  const runAllTests = async () => {
    const results: any = {};
    
    try {
      // Test: Fetch question categories
      const { data: categories, error: categoriesError } = await supabase
        .from('question_categories')
        .select('*');
      
      results.categories = {
        success: !categoriesError,
        count: categories?.length || 0,
        data: categories?.slice(0, 3) || [],
        error: categoriesError?.message
      };

      // Test: Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*, question_categories(name)')
        .limit(3);
      
      results.questions = {
        success: !questionsError,
        count: questions?.length || 0,
        data: questions || [],
        error: questionsError?.message
      };

      // Test: Check current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      results.currentUser = {
        authenticated: !!currentUser,
        user: currentUser
      };

      // Test: Fetch profiles (if user is authenticated)
      if (currentUser) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        
        results.profile = {
          success: !profileError,
          data: profile,
          error: profileError?.message
        };
      }

      setTestData(results);
      setTestResults(results);
      
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({ testError: error.message });
    }
  };

  const handleSignUp = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: testCredentials.email,
        password: testCredentials.password,
        options: {
          data: {
            full_name: testCredentials.fullName,
            company: testCredentials.company,
            area: testCredentials.area,
            section: testCredentials.section,
            report_contact: testCredentials.reportContact,
            role: 'student'
          }
        }
      });

      if (error) throw error;
      
      alert('Usuario creado exitosamente! Verifica tu email.');
      await runAllTests();
      
    } catch (error) {
      console.error('Sign up error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSignIn = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testCredentials.email,
        password: testCredentials.password
      });

      if (error) throw error;
      
      alert('Inicio de sesión exitoso!');
      await runAllTests();
      
    } catch (error) {
      console.error('Sign in error:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    await runAllTests();
  };

  const StatusIcon = ({ success }: { success: boolean }) => 
    success ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-6 w-6" />
            Prueba de Conexión con Supabase
          </CardTitle>
          <CardDescription>
            Verificando la conexión y funcionalidad de la base de datos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant={connectionStatus === 'connected' ? 'default' : connectionStatus === 'error' ? 'destructive' : 'secondary'}>
              {connectionStatus === 'checking' && 'Verificando...'}
              {connectionStatus === 'connected' && 'Conectado'}
              {connectionStatus === 'error' && 'Error de Conexión'}
            </Badge>
            {connectionStatus === 'connected' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
          </div>
          
          <Button onClick={testConnection} variant="outline">
            Volver a Probar Conexión
          </Button>
        </CardContent>
      </Card>

      {/* Authentication Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Prueba de Autenticación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <div className="space-y-2">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Usuario autenticado: {user.email}
                </AlertDescription>
              </Alert>
              <Button onClick={handleSignOut} variant="outline">
                Cerrar Sesión
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={testCredentials.email}
                    onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={testCredentials.password}
                    onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={testCredentials.fullName}
                    onChange={(e) => setTestCredentials(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={testCredentials.company}
                    onChange={(e) => setTestCredentials(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSignUp} variant="default">
                  Registrar Usuario de Prueba
                </Button>
                <Button onClick={handleSignIn} variant="outline">
                  Iniciar Sesión
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Categories Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon success={testData.categories?.success || false} />
              Categorías de Preguntas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testData.categories ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Total: {testData.categories.count} categorías
                </p>
                {testData.categories.data?.map((category: any) => (
                  <div key={category.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium">{category.name}</p>
                    <p className="text-sm text-gray-600">{category.description}</p>
                    <p className="text-xs text-gray-500">Media Nacional: {category.national_average}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Questions Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon success={testData.questions?.success || false} />
              <Brain className="h-5 w-5" />
              Preguntas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testData.questions ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Total: {testData.questions.count} preguntas
                </p>
                {testData.questions.data?.map((question: any) => (
                  <div key={question.id} className="p-2 bg-gray-50 rounded">
                    <p className="font-medium text-sm">{question.question_text}</p>
                    <Badge variant="secondary" className="text-xs">
                      {question.question_categories?.name}
                    </Badge>
                    <p className="text-xs text-gray-500">
                      Tipo: {question.question_type} | 
                      {question.is_control_question ? ' Control' : ' Normal'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay datos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profile Test */}
      {user && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon success={testData.profile?.success || false} />
              Perfil de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testData.profile?.data ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre Completo</Label>
                  <p className="text-sm">{testData.profile.data.full_name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{testData.profile.data.email}</p>
                </div>
                <div>
                  <Label>Empresa</Label>
                  <p className="text-sm">{testData.profile.data.company}</p>
                </div>
                <div>
                  <Label>Área</Label>
                  <p className="text-sm">{testData.profile.data.area}</p>
                </div>
                <div>
                  <Label>Sección</Label>
                  <p className="text-sm">{testData.profile.data.section}</p>
                </div>
                <div>
                  <Label>Rol</Label>
                  <Badge>{testData.profile.data.role}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                {testData.profile?.error || 'No hay perfil disponible'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {testResults.connectionError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Error de conexión: {testResults.connectionError}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default SupabaseTest;
