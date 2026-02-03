import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export interface AuthResult {
  userId: string;
  isAuthenticated: boolean;
  // deno-lint-ignore no-explicit-any
  supabase: any;
}

/**
 * Validates the request and returns authenticated user information.
 * For OAuth users (Google/Apple), validates JWT and extracts user ID from token.
 * Falls back to userId from request body for legacy beta users (development only).
 */
export async function validateAuth(
  req: Request,
  requestBody?: { userId?: string }
): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");

  // Try to validate JWT from Authorization header
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    
    // Skip if it's just the anon key (not a user token)
    if (token !== supabaseAnonKey) {
      try {
        // Create client with the user's token
        const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });

        // Validate the JWT and get user claims
        const { data, error } = await supabaseWithAuth.auth.getUser();

        if (!error && data?.user) {
          console.log(`Authenticated OAuth user: ${data.user.email || data.user.id}`);
          
          // Return authenticated client with service role for data operations
          // but we've verified the user identity
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          
          return {
            userId: data.user.id,
            isAuthenticated: true,
            supabase,
          };
        }
      } catch (authError) {
        console.log("JWT validation failed, falling back to legacy auth:", authError);
      }
    }
  }

  // Fallback for legacy beta users (predefined users with localStorage auth)
  // WARNING: This is insecure and should only be used for development/beta testing
  if (requestBody?.userId) {
    console.log(`Legacy auth for beta user: ${requestBody.userId}`);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    return {
      userId: requestBody.userId,
      isAuthenticated: false, // Mark as not properly authenticated
      supabase,
    };
  }

  throw new Error("Missing authentication");
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create error response
 */
export function errorResponse(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

/**
 * Create success response
 */
export function successResponse(data: unknown): Response {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
