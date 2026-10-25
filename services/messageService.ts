import AsyncStorage from '@react-native-async-storage/async-storage';
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

const STORAGE_KEY_MESSAGES = 'arnis_direct_messages_local';

export const isUUID = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

// Local storage for offline / dev / fallback mode
let localMessages: DirectMessage[] = [
  {
    id: 'msg_init_1',
    sender_id: 'mock_coach_1',
    recipient_id: 'mock_student_1',
    content: 'Mabuhay! Welcome to the academy. Keep your check hand tight to your chest while practicing Strike 1.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'msg_init_2',
    sender_id: 'mock_student_1',
    recipient_id: 'mock_coach_1',
    content: 'Opo Guro! I just shared my video recording for Strike 1. Could you check if my elbow angle is correct?',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'msg_init_3',
    sender_id: 'mock_coach_1',
    recipient_id: 'mock_student_1',
    content: 'I reviewed your clip. Your angle is 45° which is great, but remember to snap your wrist (Pitik) at the very apex before recovering.',
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

let localMessagesLoaded = false;
async function ensureLocalMessagesLoaded() {
  if (localMessagesLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_MESSAGES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Merge without duplicating IDs
        const existingIds = new Set(localMessages.map((m) => m.id));
        parsed.forEach((m: DirectMessage) => {
          if (!existingIds.has(m.id)) {
            localMessages.push(m);
            existingIds.add(m.id);
          }
        });
      }
    }
  } catch (e) {
    console.warn('[MessageService] Failed to load cached local messages:', e);
  } finally {
    localMessagesLoaded = true;
  }
}

async function persistLocalMessages() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(localMessages));
  } catch (e) {
    console.warn('[MessageService] Failed to persist local messages:', e);
  }
}

export const MessageService = {
  /**
   * Fetch chat history between two users
   */
  async fetchMessages(user1Id: string, user2Id: string): Promise<DirectMessage[]> {
    await ensureLocalMessagesLoaded();

    if (!isSupabaseConfigured || !isUUID(user1Id) || !isUUID(user2Id)) {
      return localMessages
        .filter(
          (m) =>
            (m.sender_id === user1Id && m.recipient_id === user2Id) ||
            (m.sender_id === user2Id && m.recipient_id === user1Id)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[MessageService] Error fetching messages, falling back locally:', error);
        return localMessages
          .filter(
            (m) =>
              (m.sender_id === user1Id && m.recipient_id === user2Id) ||
              (m.sender_id === user2Id && m.recipient_id === user1Id)
          )
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }

      const list = (data || []) as DirectMessage[];
      if (list.length > 0) {
        // Cache to localMessages
        const existingIds = new Set(localMessages.map((m) => m.id));
        list.forEach((m) => {
          if (!existingIds.has(m.id)) {
            localMessages.push(m);
            existingIds.add(m.id);
          }
        });
        persistLocalMessages().catch(() => {});
      }

      return list;
    } catch (e) {
      console.error('[MessageService] Exception fetching messages:', e);
      return localMessages
        .filter(
          (m) =>
            (m.sender_id === user1Id && m.recipient_id === user2Id) ||
            (m.sender_id === user2Id && m.recipient_id === user1Id)
        )
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
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
    await ensureLocalMessagesLoaded();

    const newMsg: DirectMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender_id: senderId,
      recipient_id: recipientId,
      content: content.trim(),
      session_id: sessionId || null,
      created_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured || !isUUID(senderId) || !isUUID(recipientId)) {
      localMessages.push(newMsg);
      await persistLocalMessages();
      return { error: null, message: newMsg };
    }

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content: content.trim(),
          session_id: sessionId || null,
        })
        .select()
        .single();

      if (error) {
        console.error('[MessageService] Supabase insert error, saving locally:', error);
        localMessages.push(newMsg);
        await persistLocalMessages();
        return { error: null, message: newMsg };
      }

      const saved = data as DirectMessage;
      localMessages.push(saved);
      await persistLocalMessages();

      return { error: null, message: saved };
    } catch (e: any) {
      console.error('[MessageService] Exception in sendMessage, saving locally:', e);
      localMessages.push(newMsg);
      await persistLocalMessages();
      return { error: null, message: newMsg };
    }
  },

  /**
   * Subscribe to real-time incoming direct messages
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
    await ensureLocalMessagesLoaded();

    if (!isSupabaseConfigured || !isUUID(userId)) {
      return localMessages.filter((m) => m.recipient_id === userId && !m.read_at).length;
    }

    try {
      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .is('read_at', null);

      if (error) {
        console.warn('[MessageService] Supabase getTotalUnreadCount warning, fallback to local:', error);
        return localMessages.filter((m) => m.recipient_id === userId && !m.read_at).length;
      }

      return count ?? 0;
    } catch (e) {
      console.error('[MessageService] Exception in getTotalUnreadCount:', e);
      return localMessages.filter((m) => m.recipient_id === userId && !m.read_at).length;
    }
  },

  /**
   * Mark all unread messages from a partner as read
   */
  async markThreadAsRead(userId: string, partnerId: string): Promise<void> {
    await ensureLocalMessagesLoaded();

    const nowIso = new Date().toISOString();

    // 1. Mark in localMessages
    let changedLocally = false;
    localMessages.forEach((m) => {
      if (m.sender_id === partnerId && m.recipient_id === userId && !m.read_at) {
        m.read_at = nowIso;
        changedLocally = true;
      }
    });
    if (changedLocally) {
      persistLocalMessages().catch(() => {});
    }

    // 2. Mark in Supabase
    if (isSupabaseConfigured && isUUID(userId) && isUUID(partnerId)) {
      try {
        const { error } = await supabase
          .from('direct_messages')
          .update({ read_at: nowIso })
          .eq('sender_id', partnerId)
          .eq('recipient_id', userId)
          .is('read_at', null);

        if (error) {
          console.warn('[MessageService] Supabase markThreadAsRead warning:', error);
        }
      } catch (e) {
        console.error('[MessageService] Exception in markThreadAsRead:', e);
      }
    }
  },

  /**
   * Get inbox conversation threads for coach or student
   */
  async getConversations(userId: string): Promise<ConversationThread[]> {
    await ensureLocalMessagesLoaded();

    if (!isSupabaseConfigured || !isUUID(userId)) {
      const userMsgs = localMessages.filter(
        (m) => m.sender_id === userId || m.recipient_id === userId
      );

      const partnerMap = new Map<string, DirectMessage>();
      userMsgs.forEach((m) => {
        const partner = m.sender_id === userId ? m.recipient_id : m.sender_id;
        const existing = partnerMap.get(partner);
        if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
          partnerMap.set(partner, m);
        }
      });

      const threads: ConversationThread[] = [];
      for (const [pId, lastMsg] of partnerMap.entries()) {
        const unreadCount = userMsgs.filter(
          (m) => m.sender_id === pId && m.recipient_id === userId && !m.read_at
        ).length;

        threads.push({
          partnerId: pId,
          partnerProfile: {
            id: pId,
            role: pId.includes('coach') ? 'coach' : 'student',
            display_name: pId.includes('coach') ? 'Guro Miguel Roxas' : 'Juan Dela Cruz',
            email: `${pId}@arnis.ph`,
            rank_sash: pId.includes('coach') ? 'Lakan Tatlo (3rd Dan)' : 'Green Sash',
          },
          lastMessage: lastMsg,
          unreadCount,
        });
      }
      return threads;
    }

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error || !data || data.length === 0) {
        // Fallback to local cache if DB empty
        const userMsgs = localMessages.filter(
          (m) => m.sender_id === userId || m.recipient_id === userId
        );
        if (userMsgs.length === 0) return [];

        const partnerMap = new Map<string, DirectMessage>();
        userMsgs.forEach((m) => {
          const partner = m.sender_id === userId ? m.recipient_id : m.sender_id;
          const existing = partnerMap.get(partner);
          if (!existing || new Date(m.created_at) > new Date(existing.created_at)) {
            partnerMap.set(partner, m);
          }
        });

        const threads: ConversationThread[] = [];
        for (const [pId, lastMsg] of partnerMap.entries()) {
          const unreadCount = userMsgs.filter(
            (m) => m.sender_id === pId && m.recipient_id === userId && !m.read_at
          ).length;

          threads.push({
            partnerId: pId,
            partnerProfile: null,
            lastMessage: lastMsg,
            unreadCount,
          });
        }
        return threads;
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
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', partnerIds);

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
    } catch (e) {
      console.error('[MessageService] Error getting conversations:', e);
      return [];
    }
  },
};
