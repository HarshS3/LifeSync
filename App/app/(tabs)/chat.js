import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Send, Mic, Square, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/Theme';

export default function ChatScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } = useTheme();
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
  const flatListRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
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
      const history = messages
        .filter(m => (m.from === 'user' || m.from === 'ai') && m.text)
        .slice(-10)
        .map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.text }));
      
      history.push({ role: 'user', content: trimmed });

      const res = await api.post('/ai/chat', { message: trimmed, history });
      addMessage({ from: 'ai', text: res.data.reply || 'Got it.' });
    } catch (err) {
      addMessage({ from: 'system', text: 'Connection error.' });
    } finally {
      setIsSending(false);
    }
  };

  // --- VOICE RECORDING ---
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        alert('Microphone permission is required.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const customOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.webm',
          outputFormat: Audio.AndroidOutputFormat.WEBM_OPUS,
          audioEncoder: Audio.AndroidAudioEncoder.OPUS,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      const { recording: newRec } = await Audio.Recording.createAsync(customOptions);
      setRecording(newRec);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;

    const currentRec = recording;
    setRecording(null);

    try {
      try {
        await currentRec.stopAndUnloadAsync();
      } catch (e) {
        // ignore if already unloaded
      }
      
      const uri = currentRec.getURI();
      if (!uri) return;

      setIsSending(true);
      addMessage({ from: 'system', text: 'Processing voice...' });

      const ext = Platform.OS === 'android' ? 'webm' : 'wav';
      const mime = Platform.OS === 'android' ? 'audio/webm' : 'audio/wav';
      const fileUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;

      const formData = new FormData();
      formData.append('audio', {
        uri: fileUri,
        type: mime,
        name: `voice.${ext}`,
      });

      const res = await api.post('/stt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setInput(res.data.transcript);
      addMessage({ from: 'system', text: `Heard: "${res.data.transcript}"` });
      
    } catch (err) {
      console.error('STT error', err);
      addMessage({ from: 'system', text: 'Failed to transcribe audio.' });
    } finally {
      setIsSending(false);
    }
  };

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
      const data = res.data;

      if (data.foodDetected) {
        addMessage({ 
          from: 'ai', 
          text: `I see ${data.analysis.name} (~${data.analysis.estimatedCalories} kcal). Should I log this for you?` 
        });
      } else {
        addMessage({ from: 'ai', text: "I couldn't identify any food in that image." });
      }

    } catch (err) {
      console.error('Image analysis error', err);
      addMessage({ from: 'system', text: 'Failed to analyze image.' });
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }) => {
    const isAi = item.from === 'ai';
    const isSystem = item.from === 'system';

    if (isSystem) {
      return (
        <View style={themedStyles.systemMessage}>
          <Text style={themedStyles.systemText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[themedStyles.messageRow, isAi ? themedStyles.aiRow : themedStyles.userRow]}>
        <View style={[themedStyles.messageBubble, isAi ? themedStyles.aiBubble : themedStyles.userBubble]}>
          {item.image && (
            <Image source={{ uri: item.image }} style={themedStyles.messageImage} />
          )}
          {item.text && (
             <Text style={[themedStyles.messageText, isAi ? themedStyles.aiText : themedStyles.userText]}>
               {item.text}
             </Text>
          )}
        </View>
      </View>
    );
  };

  const themedStyles = styles(COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY);

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <View>
          <Text style={themedStyles.headerTitle}>Assistant</Text>
          <Text style={themedStyles.headerSubtitle}>AI-powered health intelligence</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/profile')} style={themedStyles.avatarMini}>
           <Text style={themedStyles.avatarTextMini}>{user?.name?.charAt(0)}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={themedStyles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={themedStyles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={themedStyles.inputArea}>
          {!input && !isRecording && (
            <View style={themedStyles.hardwareButtons}>
              <TouchableOpacity style={themedStyles.iconButton} onPress={takePhoto}>
                <Camera size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={themedStyles.iconButton} onPress={pickImage}>
                <ImageIcon size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={[themedStyles.input, isRecording && themedStyles.inputHidden]}
            placeholder="Message or log food..."
            value={input}
            onChangeText={setInput}
            multiline
            placeholderTextColor={COLORS.gray400}
          />

          {isRecording && (
            <View style={themedStyles.recordingIndicator}>
              <View style={themedStyles.redDot} />
              <Text style={themedStyles.recordingText}>Listening...</Text>
            </View>
          )}

          {input.trim() ? (
            <TouchableOpacity 
              style={[themedStyles.sendButton, themedStyles.primaryButton]} 
              onPress={sendMessage}
              disabled={isSending}
            >
              {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[themedStyles.sendButton, isRecording ? themedStyles.stopButton : themedStyles.primaryButton]} 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : isRecording ? (
                <Square size={20} color="#fff" />
              ) : (
                <Mic size={20} color="#fff" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = (COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: SPACING.lg,
    paddingTop: 60,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    ...SHADOWS,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextMini: {
    color: COLORS.surface,
    fontWeight: 'bold',
  },
  keyboardView: {
    flex: 1,
  },
  messageList: {
    padding: SPACING.md,
    paddingBottom: 32,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
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
  aiBubble: {
    backgroundColor: COLORS.gray100,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    ...TYPOGRAPHY.body,
    fontSize: 15,
    lineHeight: 20,
  },
  aiText: {
    color: COLORS.text,
  },
  userText: {
    color: COLORS.surface,
  },
  systemMessage: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 12,
  },
  systemText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    backgroundColor: COLORS.surface,
  },
  hardwareButtons: {
    flexDirection: 'row',
    marginRight: 8,
  },
  iconButton: {
    padding: 8,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.gray100,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
    color: COLORS.text,
    maxHeight: 100,
  },
  inputHidden: {
    display: 'none',
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '25',
    borderRadius: 24,
    height: 44,
    marginRight: 12,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.error,
    marginRight: 8,
  },
  recordingText: {
    color: COLORS.error,
    fontWeight: '600',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
});
