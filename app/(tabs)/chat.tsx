import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Message {
  id: string;
  sender: 'user' | 'coach';
  text: string;
  time: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_1',
    sender: 'coach',
    text: 'Hello! I am your Arnis Coach Assistant. Ask me anything about the 12 strikes, elbow angles, stance, or how to improve your evaluation scores!',
    time: '18:00'
  }
];

const SUGGESTIONS = [
  "How to improve Strike 1?",
  "What is the ideal angle for Strike 5?",
  "Tell me about Strike 12 stance.",
  "How is wrist alignment graded?"
];

const COACH_RESPONSES: Record<string, string> = {
  "how to improve strike 1?": "For Strike 1 (Left Temple), ensure your striking elbow is held between 92.3° and 150.8°. Keep your wrist aligned at about -10° to -15° relative to the forearm. Maintain a stable forward stance and ensure your lead knee is slightly bent to absorb the strike's weight.",
  "what is the ideal angle for strike 5?": "Strike 5 is the Abdomen Thrust. It requires a direct forward lunge. The ideal angle for the striking elbow is almost straight, between 155.7° and 169.2°. Make sure to step forward and direct the force horizontally through the opponent's core.",
  "tell me about strike 12 stance.": "Strike 12 is the Crown Strike, a direct vertical overhead attack targeting the top of the skull. Bring the stick straight overhead, keeping the elbow flexed between 90.0° and 130.2° before extension. Your stance should be solid and neutral, keeping your weight centered to avoid overbalancing.",
  "how is wrist alignment graded?": "Wrist alignment is calculated as the angular difference between your striking elbow and wrist vector. If your wrist is kept straight (-10° ideal offset), you achieve 95%+ accuracy. Letting your wrist sag or bend too early decreases the alignment score."
};

export default function CoachChatScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: 'msg_user_' + Date.now(),
      sender: 'user',
      text: text,
      time: formatTime()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    scrollViewRef.current?.scrollToEnd({ animated: true });

    // Trigger coach response
    setIsTyping(true);
    setTimeout(() => {
      const normalizedQuery = text.toLowerCase().trim();
      let responseText = "I see. Practice the strike carefully and pay attention to your elbow flexion range! You can reference the exact ranges on the Lessons tab.";
      
      // Check if we have a match in responses
      for (const key in COACH_RESPONSES) {
        if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
          responseText = COACH_RESPONSES[key];
          break;
        }
      }

      const coachMsg: Message = {
        id: 'msg_coach_' + Date.now(),
        sender: 'coach',
        text: responseText,
        time: formatTime()
      };

      setIsTyping(false);
      setMessages(prev => [...prev, coachMsg]);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/')} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Coach Assistant</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => (
            <View 
              key={item.id} 
              style={[
                styles.messageRow,
                item.sender === 'user' ? styles.userRow : styles.coachRow
              ]}
            >
              {item.sender === 'coach' && (
                <View style={styles.avatarContainer}>
                  <MaterialCommunityIcons name="sword" size={16} color="#FFFFFF" />
                </View>
              )}
              
              <View 
                style={[
                  styles.bubble,
                  item.sender === 'user' ? styles.userBubble : styles.coachBubble
                ]}
              >
                <Text style={styles.bubbleText}>{item.text}</Text>
                <Text style={styles.bubbleTime}>{item.time}</Text>
              </View>
            </View>
          ))}

          {isTyping && (
            <View style={[styles.messageRow, styles.coachRow]}>
              <View style={styles.avatarContainer}>
                <MaterialCommunityIcons name="sword" size={16} color="#FFFFFF" />
              </View>
              <View style={[styles.bubble, styles.coachBubble, styles.typingBubble]}>
                <Text style={styles.typingText}>Coach is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Suggestions Row */}
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
            {SUGGESTIONS.map((item, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={styles.suggestionChip}
                onPress={() => handleSendMessage(item)}
              >
                <Text style={styles.suggestionChipText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Ask your coach..."
            placeholderTextColor="#64748B"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage(inputText)}
          />
          <TouchableOpacity 
            style={styles.sendButton}
            onPress={() => handleSendMessage(inputText)}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1020',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#161930',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  keyboardContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    paddingBottom: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  coachRow: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: '#D24B38',
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
  },
  bubbleTime: {
    color: '#94A3B850',
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingBubble: {
    paddingVertical: 10,
  },
  typingText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#161930',
    paddingVertical: 10,
    backgroundColor: '#0F1020',
  },
  suggestionsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#161930',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    height: 34,
    justifyContent: 'center',
  },
  suggestionChipText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0A0C16',
    borderTopWidth: 1,
    borderTopColor: '#161930',
    gap: 12,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#161930',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    color: '#FFFFFF',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D24B38',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
