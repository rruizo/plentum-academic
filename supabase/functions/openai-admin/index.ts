import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "validate" | "models" | "usage";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    const { action } = (await req.json().catch(() => ({}))) as Partial<RequestBody>;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "OPENAI_API_KEY no está configurada en Supabase Secrets.",
          hint:
            "Agrega el secreto OPENAI_API_KEY en Settings > Edge Functions > Secrets y vuelve a intentar.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "validate") {
      // Simple validation by requesting the models endpoint
      const resp = await fetch("https://api.openai.com/v1/models?limit=1", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      const ok = resp.ok;
      const detail = ok ? undefined : await resp.text().catch(() => undefined);

      return new Response(JSON.stringify({ ok, detail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "models") {
      const resp = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        return new Response(JSON.stringify({ ok: false, error: txt || "No se pudieron obtener modelos" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await resp.json();
      const ids: string[] = (data?.data || []).map((m: any) => m.id);
      // Suggested subset ordered for UI
      const preferredOrder = [
        "gpt-4.1-nano",
        "gpt-4.1-mini-2025-04-14",
        "gpt-4.1-mini",
        "gpt-4.1-2025-04-14",
        "gpt-4.1",
        "gpt-4o-mini",
        "gpt-4o",
        "o4-mini-2025-04-16",
      ];
      const availablePreferred = preferredOrder.filter((id) => ids.includes(id));
      const others = ids.filter((id) => !availablePreferred.includes(id));

      return new Response(
        JSON.stringify({ ok: true, models: [...availablePreferred, ...others] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "usage") {
      // Nota: OpenAI no ofrece un endpoint oficial de "saldo" público estable.
      // Intentamos recuperar uso; si falla, devolvemos unsupported.
      try {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .slice(0, 10);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .slice(0, 10);

        const u = await fetch(
          `https://api.openai.com/v1/usage?start_date=${start}&end_date=${end}`,
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!u.ok) {
          const txt = await u.text().catch(() => "");
          return new Response(
            JSON.stringify({ ok: false, unsupported: true, message: "Uso/saldo no disponible", detail: txt }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const usage = await u.json();
        return new Response(JSON.stringify({ ok: true, unsupported: false, usage }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (e) {
        return new Response(
          JSON.stringify({ ok: false, unsupported: true, message: "Uso/saldo no disponible", detail: String(e) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Acción no soportada" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("openai-admin error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
