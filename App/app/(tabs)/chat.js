import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Send, Mic, Square, Camera, Image as ImageIcon, X } from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

export default function ChatScreen() {
  const { token } = useAuth();
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

      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      setIsSending(true);
      addMessage({ from: 'system', text: 'Processing voice...' });

      // Upload audio to STT
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'voice.m4a',
      });

      const res = await fetch(`${api.defaults.baseURL}/stt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setInput(data.transcript);
      addMessage({ from: 'system', text: `Heard: "${data.transcript}"` });
      
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
      const formData = new FormData();
      formData.append('image', {
        uri,
        type: 'image/jpeg',
        name: 'meal.jpg',
      });

      const res = await fetch(`${api.defaults.baseURL}/photo-log/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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
        <View style={styles.systemMessage}>
          <Text style={styles.systemText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isAi ? styles.aiRow : styles.userRow]}>
        <View style={[styles.messageBubble, isAi ? styles.aiBubble : styles.userBubble]}>
          {item.image && (
            <Image source={{ uri: item.image }} style={styles.messageImage} />
          )}
          {item.text && (
             <Text style={[styles.messageText, isAi ? styles.aiText : styles.userText]}>
               {item.text}
             </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      <View style={styles.inputArea}>
        {!input && !isRecording && (
          <View style={styles.hardwareButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={takePhoto}>
              <Camera size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
              <ImageIcon size={24} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={[styles.input, isRecording && styles.inputHidden]}
          placeholder="Message or log food..."
          value={input}
          onChangeText={setInput}
          multiline
        />

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.redDot} />
            <Text style={styles.recordingText}>Listening...</Text>
          </View>
        )}

        {input.trim() ? (
          <TouchableOpacity 
            style={[styles.sendButton, styles.primaryButton]} 
            onPress={sendMessage}
            disabled={isSending}
          >
            {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Send size={20} color="#fff" />}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={[styles.sendButton, isRecording ? styles.stopButton : styles.primaryButton]} 
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageList: {
    padding: 16,
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
    backgroundColor: '#f0f0f0',
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#000',
    borderBottomRightRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  aiText: {
    color: '#000',
  },
  userText: {
    color: '#fff',
  },
  systemMessage: {
    alignSelf: 'center',
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  systemText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 12,
    fontSize: 16,
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
    backgroundColor: '#fee2e2',
    borderRadius: 24,
    height: 44,
    marginRight: 12,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginRight: 8,
  },
  recordingText: {
    color: '#ef4444',
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
    backgroundColor: '#000',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
});
