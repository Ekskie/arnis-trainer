import { isSupabaseConfigured, supabase, UserProfile } from './supabase';

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  session_id?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface ConversationThread {
  partnerId: string;
  partnerProfile: UserProfile | null;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export const isUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

export const MessageService = {
  /**
   * Fetch chat history between two users
   */
  async fetchMessages(user1Id: string, user2Id: string): Promise<DirectMessage[]> {
    if (!isSupabaseConfigured || !isUUID(user1Id) || !isUUID(user2Id)) {
      throw new Error('Direct messaging requires an active cloud account.');
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Failed to load messages.');
    }

    return (data || []) as DirectMessage[];
  },

  /**
   * Send a direct message
   */
  async sendMessage(
    senderId: string,
    recipientId: string,
    content: string,
    sessionId?: string
  ): Promise<{ error: Error | null; message?: DirectMessage }> {
    const trimmed = content.trim();
    if (!trimmed) {
      return { error: new Error('Cannot send an empty message.') };
    }
    if (!isSupabaseConfigured || !isUUID(senderId) || !isUUID(recipientId)) {
      return { error: new Error('Cloud messaging is unavailable in this session.') };
    }

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content: trimmed,
          session_id: sessionId || null,
        })
        .select()
        .single();

      if (error) {
        return { error: new Error(error.message || 'Failed to deliver message.') };
      }

      return { error: null, message: data as DirectMessage };
    } catch (e: any) {
      return { error: e instanceof Error ? e : new Error('Failed to send message.') };
    }
  },

  /**
   * Subscribe to real-time incoming direct messages between two users
   */
  subscribeToMessages(
    user1Id: string,
    user2Id: string,
    onNewMessage: (msg: DirectMessage) => void
  ) {
    if (!isSupabaseConfigured || !isUUID(user1Id) || !isUUID(user2Id)) {
      return () => {};
    }

    const channelName = `dm_${[user1Id, user2Id].sort().join('_')}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newRecord = payload.new as DirectMessage;
          if (
            newRecord &&
            ((newRecord.sender_id === user1Id && newRecord.recipient_id === user2Id) ||
              (newRecord.sender_id === user2Id && newRecord.recipient_id === user1Id))
          ) {
            onNewMessage(newRecord);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Subscribe globally to any incoming direct messages for this user
   */
  subscribeToUserMessages(
    userId: string,
    onNewMessage: (msg: DirectMessage) => void
  ) {
    if (!isSupabaseConfigured || !isUUID(userId)) {
      return () => {};
    }

    const channelName = `user_inbox_${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const newRecord = payload.new as DirectMessage;
          if (newRecord && newRecord.recipient_id === userId) {
            onNewMessage(newRecord);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  /**
   * Get total count of unread messages across all conversations for a user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    if (!isSupabaseConfigured || !isUUID(userId)) {
      return 0;
    }

    try {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error) {
        console.warn('[MessageService] Unread count check failed:', error.message);
        return 0;
      }

      return count ?? 0;
    } catch (e) {
      console.warn('[MessageService] Unread count error:', e);
      return 0;
    }
  },

  /**
   * Mark all unread messages from a partner as read
   */
  async markThreadAsRead(userId: string, partnerId: string): Promise<void> {
    if (!isSupabaseConfigured || !isUUID(userId) || !isUUID(partnerId)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', partnerId)
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error) {
        console.warn('[MessageService] markThreadAsRead warning:', error.message);
      }
    } catch (e) {
      console.warn('[MessageService] Exception in markThreadAsRead:', e);
    }
  },

  /**
   * Get inbox conversation threads for coach or student
   */
  async getConversations(userId: string): Promise<ConversationThread[]> {
    if (!isSupabaseConfigured || !isUUID(userId)) {
      return [];
    }

    const { data, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Unable to load conversations.');
    }

    if (!data || data.length === 0) {
      return [];
    }

    const partnerMap = new Map<string, DirectMessage>();
    data.forEach((m: DirectMessage) => {
      const partner = m.sender_id === userId ? m.recipient_id : m.sender_id;
      if (!partnerMap.has(partner)) {
        partnerMap.set(partner, m);
      }
    });

    const threads: ConversationThread[] = [];
    const partnerIds = Array.from(partnerMap.keys());

    if (partnerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', partnerIds);

      if (profilesError) {
        console.warn('[MessageService] Partner profile load warning:', profilesError.message);
      }

      const profileMap = new Map((profiles || []).map((p: UserProfile) => [p.id, p]));

      for (const [pId, lastMsg] of partnerMap.entries()) {
        const unreadCount = data.filter(
          (m: DirectMessage) => m.sender_id === pId && m.recipient_id === userId && !m.read_at
        ).length;

        threads.push({
          partnerId: pId,
          partnerProfile: (profileMap.get(pId) as UserProfile) || null,
          lastMessage: lastMsg,
          unreadCount,
        });
      }
    }

    return threads;
  },
};
