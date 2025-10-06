import { AlertTriangle, ExternalLink, Shield, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const SecurityConfigGuide = () => {
  const securityIssues = [
    {
      id: 1,
      type: "AUTH_CONFIG",
      severity: "WARN",
      title: "Auth OTP Long Expiry",
      description: "OTP expiry time exceeds recommended security threshold",
      action: "Configure shorter OTP expiry in Supabase Auth settings",
      link: "https://supabase.com/docs/guides/platform/going-into-prod#security",
      steps: [
        "Go to Supabase Dashboard → Authentication → Settings",
        "Find 'OTP expiry' setting",
        "Set to 600 seconds (10 minutes) or less for better security"
      ]
    },
    {
      id: 2,
      type: "PASSWORD_SECURITY",
      severity: "WARN", 
      title: "Leaked Password Protection Disabled",
      description: "Password breach detection is currently disabled",
      action: "Enable leaked password protection",
      link: "https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection",
      steps: [
        "Go to Supabase Dashboard → Authentication → Settings",
        "Find 'Password strength and leaked password protection' section",
        "Toggle ON 'Enable leaked password protection'",
        "This prevents users from using commonly breached passwords"
      ]
    }
  ];

  const implementedFixes = [
    "✅ Role escalation protection - Users cannot change their own roles",
    "✅ Database function security - All functions use proper search_path",
    "✅ Enhanced password generation - 12-character passwords with special characters",
    "✅ Input validation and sanitization in Edge Functions",
    "✅ Email format validation on client and server",
    "✅ Role change audit logging implemented",
    "✅ Proper authorization checks for admin actions"
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Security Status Report
          </CardTitle>
          <CardDescription>
            Critical security fixes have been implemented. Manual configuration required for remaining items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-green-600 mb-2">✅ Successfully Implemented</h3>
            <div className="space-y-1">
              {implementedFixes.map((fix, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{fix}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Remaining Configuration Required
        </h2>
        
        {securityIssues.map((issue) => (
          <Card key={issue.id} className="border-amber-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{issue.title}</CardTitle>
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {issue.severity}
                </Badge>
              </div>
              <CardDescription>{issue.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  Action Required: {issue.action}
                </AlertDescription>
              </Alert>
              
              <div>
                <h4 className="font-semibold mb-2">Steps to Fix:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {issue.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
              
              <a 
                href={issue.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                View Documentation
              </a>
            </CardContent>
          </Card>
        ))}
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> After completing the above configurations, your application will have comprehensive security protections in place. The implemented fixes prevent the most critical vulnerabilities including role escalation attacks and SQL injection attempts.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SecurityConfigGuide;