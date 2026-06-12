import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Send, Mic, Square, Camera, Image as ImageIcon } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';

// UI Components
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Body, Caption } from '../../components/ui/Typography';

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { COLORS, SHADOWS } = useTheme();
  
  const [messages, setMessages] = useState([
    {
      id: '1',
      from: 'ai',
      text: 'Hi! Type a message, hold the mic to speak, or snap a photo of your meal to log it.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [threadId, setThreadId] = useState(null);
  
  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const handledWidgetActionRef = useRef(null);
  const isRecordingRequestedRef = useRef(false); 
  const isStartingRecordingRef = useRef(false);

  // --- CLEANUP ---
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [recording]);

  const addMessage = (msg) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), ...msg }]);
  };

  // --- TEXT CHAT ---
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    addMessage({ from: 'user', text: trimmed });
    setInput('');
    setIsSending(true);

    try {
      // Server owns full history via threadId; we still send a compact tail for offline/anon fallback.
      const history = messages
        .filter(m => (m.from === 'user' || m.from === 'ai') && m.text)
        .slice(-10)
        .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }));

      history.push({ role: 'user', content: trimmed });

      const res = await api.post('/ai/chat', { message: trimmed, history, threadId });
      if (res.data?.threadId && res.data.threadId !== threadId) {
        setThreadId(res.data.threadId);
      }
      addMessage({ from: 'ai', text: res.data.reply || 'Got it.' });
    } catch (err) {
      console.error('Chat error', err);
      const errorMsg = err.response?.status === 401 
        ? 'Session expired. Please log out and in again.' 
        : 'Connection error.';
      addMessage({ from: 'system', text: errorMsg });
    } finally {
      setIsSending(false);
    }
  };

  // --- VOICE RECORDING ---
  const startRecording = async () => {
    if (isStartingRecordingRef.current) return;
    
    try {
      isStartingRecordingRef.current = true;
      isRecordingRequestedRef.current = true; 
      
      if (recording) {
        try { await recording.stopAndUnloadAsync(); } catch (e) {}
        setRecording(null);
      }

      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Microphone permission is required.');
        isRecordingRequestedRef.current = false;
        isStartingRecordingRef.current = false;
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const customOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const { recording: newRec } = await Audio.Recording.createAsync(customOptions);
      
      if (!isRecordingRequestedRef.current) {
        try { await newRec.stopAndUnloadAsync(); } catch (e) {}
        isStartingRecordingRef.current = false;
        return;
      }

      setRecording(newRec);
      setIsRecording(true);
    } catch (err) {
      if (!err.message?.includes('no valid audio data')) {
        console.error('Failed to start recording', err);
      }
      setIsRecording(false);
      setRecording(null);
      isRecordingRequestedRef.current = false;
    } finally {
      isStartingRecordingRef.current = false;
    }
  };

  const stopRecording = async () => {
    isRecordingRequestedRef.current = false;
    await new Promise(resolve => setTimeout(resolve, 300));

    setIsRecording(false);
    const currentRec = recording;
    setRecording(null);

    if (!currentRec) return;

    try {
      try {
        const status = await currentRec.getStatusAsync();
        if (status.canRecord || status.isRecording) {
          await currentRec.stopAndUnloadAsync();
        }
      } catch (e) {
        if (!e.message?.includes('no valid audio data')) {
          console.log('Recorder stop error', e.message);
        }
        return;
      }
      
      const uri = currentRec.getURI();
      if (!uri) return;

      setIsSending(true);
      addMessage({ from: 'system', text: 'Transcribing...' });

      const formData = new FormData();
      formData.append('audio', {
        uri: Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri,
        type: 'audio/mp4',
        name: 'voice.m4a',
      });

      const res = await api.post('/stt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.transcript) {
        setInput(res.data.transcript);
        addMessage({ from: 'system', text: 'Text ready in your input box.' });
      }
      
    } catch (err) {
      console.error('STT error', err);
      addMessage({ from: 'system', text: 'Failed to transcribe audio.' });
    } finally {
      setIsSending(false);
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const action = params.widgetAction;
    if (!action || handledWidgetActionRef.current === action) return;

    handledWidgetActionRef.current = action;
    if (action === 'voice') {
      addMessage({ from: 'system', text: 'Voice quick log opened from your widget.' });
      setTimeout(() => startRecording(), 500);
    } else if (action === 'text' || action === 'assistant') {
      addMessage({ from: 'system', text: 'Assistant quick log opened from your widget.' });
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [params.widgetAction]);

  // --- PHOTO LOGGING ---
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Camera access is required.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    handleImageResult(result);
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Gallery access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });
    handleImageResult(result);
  };

  const handleImageResult = async (result) => {
    if (result.canceled || !result.assets[0].uri) return;
    const uri = result.assets[0].uri;

    addMessage({ from: 'user', image: uri });
    setIsSending(true);

    try {
      const fileUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
      const formData = new FormData();
      formData.append('image', {
        uri: fileUri,
        type: 'image/jpeg',
        name: 'meal.jpg',
      });

      const res = await api.post('/photo-log/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data || {};
      const detected = Array.isArray(data.detected) ? data.detected : [];

      if (detected.length === 0) {
        addMessage({ from: 'ai', text: "I couldn't identify any food in that image." });
      } else {
        addMessage({
          from: 'ai',
          mealCandidate: {
            detected,
            mealType: data.mealType || 'snack',
            overallConfidence: data.overallConfidence || 'medium',
            notes: data.notes || '',
          },
        });
      }
    } catch (err) {
      console.error('Image analysis error', err);
      addMessage({ from: 'system', text: 'Failed to analyze image.' });
    } finally {
      setIsSending(false);
    }
  };

  const commitMealCandidate = async (messageId, candidate) => {
    try {
      setIsSending(true);
      const res = await api.post('/photo-log/commit', {
        items: candidate.detected,
        mealType: candidate.mealType,
      });
      const data = res.data || {};
      // Mark this candidate message as logged so the buttons collapse to a confirmation line.
      setMessages(prev => prev.map(m => m.id === messageId
        ? { ...m, mealCandidate: { ...m.mealCandidate, loggedAs: data.mealName, loggedKcal: data.totalCalories } }
        : m));
      addMessage({ from: 'ai', text: `Logged "${data.mealName}" (${data.totalCalories} kcal).` });
    } catch (err) {
      console.error('Photo log commit error', err);
      addMessage({ from: 'system', text: 'Failed to save meal.' });
    } finally {
      setIsSending(false);
    }
  };

  const dismissMealCandidate = (messageId) => {
    setMessages(prev => prev.map(m => m.id === messageId
      ? { ...m, mealCandidate: { ...m.mealCandidate, dismissed: true } }
      : m));
  };

  const renderMessage = ({ item }) => {
    const isAi = item.from === 'ai';
    const isSystem = item.from === 'system';

    if (isSystem) {
      return (
        <View style={[styles.systemMessage, { backgroundColor: COLORS.gray100 }]}>
          <Caption secondary style={{ fontWeight: '600' }}>{item.text}</Caption>
        </View>
      );
    }

    if (item.mealCandidate) {
      const c = item.mealCandidate;
      const total = c.detected.reduce((s, f) => s + Number(f.estimatedCalories || 0), 0);
      const isLogged = !!c.loggedAs;
      const isDismissed = !!c.dismissed;
      return (
        <View style={[styles.messageRow, styles.aiRow]}>
          <View style={[styles.candidateCard, { backgroundColor: COLORS.gray100, borderColor: COLORS.border }]}>
            <Body style={{ fontWeight: '700', marginBottom: 4 }}>
              {isLogged ? `Logged: ${c.loggedAs}` : 'Meal detected'}
            </Body>
            {c.detected.map((f, i) => (
              <View key={i} style={styles.candidateRow}>
                <Body style={{ flex: 1 }}>{f.name} <Caption secondary>({f.quantity}{f.unit})</Caption></Body>
                <Caption style={{ fontWeight: '600' }}>{Math.round(f.estimatedCalories || 0)} kcal</Caption>
              </View>
            ))}
            <View style={[styles.candidateRow, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 6 }]}>
              <Body style={{ fontWeight: '700', flex: 1 }}>Total</Body>
              <Body style={{ fontWeight: '700' }}>{Math.round(total)} kcal</Body>
            </View>
            {!isLogged && !isDismissed && (
              <View style={styles.candidateActions}>
                <TouchableOpacity
                  onPress={() => commitMealCandidate(item.id, c)}
                  style={[styles.candidateBtn, { backgroundColor: COLORS.primary }]}
                  disabled={isSending}
                >
                  <Caption style={{ color: COLORS.surface, fontWeight: '700' }}>Log this meal</Caption>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => dismissMealCandidate(item.id)}
                  style={[styles.candidateBtn, { backgroundColor: 'transparent', borderColor: COLORS.border, borderWidth: 1 }]}
                >
                  <Caption secondary style={{ fontWeight: '700' }}>Dismiss</Caption>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isAi ? styles.aiRow : styles.userRow]}>
        <View style={[
          styles.messageBubble,
          isAi ? { backgroundColor: COLORS.gray100, borderBottomLeftRadius: 4 } : { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 }
        ]}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.messageImage} />
          )}
          {item.text && (
             <Body style={isAi ? { color: COLORS.text } : { color: COLORS.surface }}>
               {item.text}
             </Body>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper 
      title="Assistant" 
      showBack={false}
      headerRight={
        <TouchableOpacity onPress={() => router.push('/profile')} style={[styles.avatarMini, { backgroundColor: COLORS.primary }]}>
           <Caption style={{ color: COLORS.surface, fontWeight: 'bold' }}>{user?.name?.charAt(0)}</Caption>
        </TouchableOpacity>
      }
    >
      <KeyboardAvoidingView 
        behavior="padding"
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 110}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputArea, { backgroundColor: COLORS.surface, borderTopColor: COLORS.border, ...SHADOWS }]}>
          {!input && !isRecording && (
            <View style={styles.hardwareButtons}>
              <TouchableOpacity style={styles.iconButton} onPress={takePhoto}>
                <Camera size={22} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                <ImageIcon size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            ref={inputRef}
            style={[
              styles.input, 
              { backgroundColor: COLORS.gray100, color: COLORS.text },
              isRecording && styles.inputHidden
            ]}
            placeholder="Message or log food..."
            value={input}
            onChangeText={setInput}
            placeholderTextColor={COLORS.gray400}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />

          {isRecording && (
            <View style={[styles.recordingIndicator, { backgroundColor: COLORS.error + '20' }]}>
              <View style={[styles.redDot, { backgroundColor: COLORS.error }]} />
              <Body style={{ color: COLORS.error, fontWeight: '700' }}>Listening...</Body>
            </View>
          )}

          <TouchableOpacity 
            style={[
              styles.sendButton, 
              { backgroundColor: isRecording ? COLORS.error : COLORS.primary },
              isSending && { opacity: 0.6 }
            ]} 
            onPress={input.trim() ? sendMessage : (isRecording ? stopRecording : startRecording)}
            disabled={isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={COLORS.primaryContrast} />
            ) : input.trim() ? (
              <Send size={18} color={COLORS.primaryContrast} />
            ) : isRecording ? (
              <Square size={18} color="#fff" />
            ) : (
              <Mic size={18} color={COLORS.primaryContrast} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: 16,
    paddingBottom: 32,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  aiRow: {
    alignSelf: 'flex-start',
  },
  userRow: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
    marginBottom: 8,
  },
  systemMessage: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
  },
  hardwareButtons: {
    flexDirection: 'row',
    marginRight: 4,
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
    maxHeight: 120,
  },
  inputHidden: {
    display: 'none',
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    height: 44,
    marginRight: 10,
  },
  redDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  candidateCard: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  candidateActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  candidateBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
});
