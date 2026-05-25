import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatRequest {
  session_id?: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { session_id, message }: ChatRequest = await req.json();

    let currentSessionId = session_id;

    // Create or get session
    if (!currentSessionId) {
      const { data: newSession, error: sessionError } = await supabaseClient
        .from('ai_sessions')
        .insert({
          user_id: user.id,
          titre: message.substring(0, 50),
        })
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      currentSessionId = newSession.id;
    }

    // Save user message
    await supabaseClient.from('ai_messages').insert({
      session_id: currentSessionId,
      role: 'user',
      contenu: message,
    });

    // Simulate AI response (in production, call OpenAI API here)
    const aiResponse = generateSimulatedResponse(message);

    // Save AI response
    await supabaseClient.from('ai_messages').insert({
      session_id: currentSessionId,
      role: 'assistant',
      contenu: aiResponse,
    });

    // Log activity
    await supabaseClient.from('activity_logs').insert({
      user_id: user.id,
      action_type: 'acces_ia',
      metadata: {
        session_id: currentSessionId,
        message_length: message.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        session_id: currentSessionId,
        response: aiResponse,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function generateSimulatedResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('mathématiques') || lowerMessage.includes('math')) {
    return "Je suis là pour vous aider avec les mathématiques ! Quelle est votre question spécifique ? Pouvez-vous me donner plus de détails sur le problème que vous rencontrez ?";
  }

  if (lowerMessage.includes('français') || lowerMessage.includes('grammaire')) {
    return "Je peux vous aider avec le français et la grammaire. Quelle notion souhaitez-vous réviser ? N'hésitez pas à me poser des questions précises.";
  }

  if (lowerMessage.includes('aide') || lowerMessage.includes('help')) {
    return "Je suis votre assistant éducatif. Je peux vous aider avec vos devoirs, expliquer des concepts, et répondre à vos questions sur différentes matières. Comment puis-je vous aider aujourd'hui ?";
  }

  if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut')) {
    return "Bonjour ! Je suis ravi de vous aider dans votre apprentissage. Quelle matière ou quel sujet souhaitez-vous explorer aujourd'hui ?";
  }

  return "Je comprends votre question. Pouvez-vous me donner plus de détails pour que je puisse vous aider de manière plus précise ? N'hésitez pas à reformuler ou à préciser votre demande.";
}
