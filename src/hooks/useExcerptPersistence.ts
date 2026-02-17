import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tables } from '@/integrations/supabase/types';

type Excerpt = Tables<'chat_excerpts'>;

interface CreateExcerptData {
  parentSessionId?: string;
  title: string;
  userMessage: string;
  assistantMessage: string;
  billId?: number;
  memberId?: number;
  committeeId?: number;
}

interface PublishBlogData {
  parentSessionId?: string;
  title: string;
  description: string;
  messages: Array<{ role: string; content: string }>;
}

export const useExcerptPersistence = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExcerpt = useCallback(async (data: CreateExcerptData): Promise<Excerpt | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: excerpt, error: insertError } = await supabase
        .from('chat_excerpts')
        .insert({
          user_id: user.id,
          parent_session_id: data.parentSessionId || null,
          title: data.title,
          user_message: data.userMessage,
          assistant_message: data.assistantMessage,
          bill_id: data.billId || null,
          member_id: data.memberId || null,
          committee_id: data.committeeId || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return excerpt;
    } catch (err: any) {
      setError(err.message || 'Failed to create excerpt');
      console.error('Error creating excerpt:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchExcerpts = useCallback(async (limit = 20): Promise<Excerpt[]> => {
    if (!user) return [];

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_excerpts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err: any) {
      console.error('Error fetching excerpts:', err);
      return [];
    }
  }, [user]);

  const fetchExcerptById = useCallback(async (id: string): Promise<Excerpt | null> => {
    if (!user) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from('chat_excerpts')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err: any) {
      console.error('Error fetching excerpt:', err);
      return null;
    }
  }, [user]);

  const deleteExcerpt = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error: deleteError } = await supabase
        .from('chat_excerpts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      return true;
    } catch (err: any) {
      console.error('Error deleting excerpt:', err);
      return false;
    }
  }, [user]);

  const publishChatAsBlog = useCallback(async (data: PublishBlogData): Promise<Excerpt | null> => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: post, error: insertError } = await supabase
        .from('chat_excerpts')
        .insert({
          user_id: user.id,
          parent_session_id: data.parentSessionId || null,
          title: data.title,
          description: data.description,
          user_message: data.messages[0]?.content || '',
          assistant_message: data.messages[1]?.content || '',
          is_published: true,
          messages: data.messages as unknown,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return post;
    } catch (err: any) {
      setError(err.message || 'Failed to publish blog post');
      console.error('Error publishing blog post:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchPublishedPosts = useCallback(async (limit = 20): Promise<Excerpt[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_excerpts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      return data || [];
    } catch (err: any) {
      console.error('Error fetching published posts:', err);
      return [];
    }
  }, []);

  const fetchPublishedPostById = useCallback(async (id: string): Promise<Excerpt | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('chat_excerpts')
        .select('*')
        .eq('id', id)
        .eq('is_published', true)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err: any) {
      console.error('Error fetching published post:', err);
      return null;
    }
  }, []);

  return {
    createExcerpt,
    fetchExcerpts,
    fetchExcerptById,
    deleteExcerpt,
    publishChatAsBlog,
    fetchPublishedPosts,
    fetchPublishedPostById,
    loading,
    error,
  };
};
