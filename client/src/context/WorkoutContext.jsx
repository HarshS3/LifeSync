import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_BASE } from '../config'
import { useAuth } from './AuthContext'
import { toast } from 'react-hot-toast'

const WorkoutContext = createContext()

export const useWorkout = () => {
  const context = useContext(WorkoutContext)
  if (!context) {
    throw new Error('useWorkout must be used within a WorkoutProvider')
  }
  return context
}

export const WorkoutProvider = ({ children }) => {
  const { token } = useAuth()
  const [currentWorkout, setCurrentWorkout] = useState(null)
  const [workoutStartTime, setWorkoutStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Load active workout from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('lifesync_active_workout')
      if (saved) {
        const { workout, startTime } = JSON.parse(saved)
        if (workout && startTime) {
          setCurrentWorkout(workout)
          setWorkoutStartTime(startTime)
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
        }
      }
    } catch (err) {
      console.error('Failed to load active workout from storage:', err)
    }
  }, [])

  // Save active workout to localStorage when it changes
  useEffect(() => {
    try {
      if (currentWorkout) {
        localStorage.setItem('lifesync_active_workout', JSON.stringify({
          workout: currentWorkout,
          startTime: workoutStartTime
        }))
      } else {
        localStorage.removeItem('lifesync_active_workout')
      }
    } catch (err) {
      console.error('Failed to update storage with active workout:', err)
    }
  }, [currentWorkout, workoutStartTime])

  // Timer interval
  useEffect(() => {
    let interval
    if (currentWorkout && workoutStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - workoutStartTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [currentWorkout, workoutStartTime])

  const startWorkout = useCallback((initialData = null) => {
    const workout = initialData || {
      name: `Workout - ${new Date().toLocaleDateString()}`,
      exercises: [],
      date: new Date().toISOString().split('T')[0],
    }
    setCurrentWorkout(workout)
    const startTime = Date.now()
    setWorkoutStartTime(startTime)
    setElapsedTime(0)
  }, [])

  const cancelWorkout = useCallback(() => {
    if (window.confirm('Discard this workout?')) {
      setCurrentWorkout(null)
      setWorkoutStartTime(null)
      setElapsedTime(0)
      try {
        localStorage.removeItem('lifesync_active_workout')
      } catch (err) {
        console.error('Failed to remove active workout from storage:', err)
      }
    }
  }, [])

  const finishWorkout = useCallback(async () => {
    if (!currentWorkout || currentWorkout.exercises.length === 0) {
      alert('Add at least one exercise!')
      return false
    }

    const workoutData = {
      ...currentWorkout,
      duration: elapsedTime,
      date: currentWorkout._id ? currentWorkout.date : new Date(),
    }

    const isEdit = !!currentWorkout._id

    try {
      const res = await fetch(`${API_BASE}/api/gym/workouts${isEdit ? `/${currentWorkout._id}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(workoutData),
      })

      if (res.ok) {
        toast.success(isEdit ? 'Workout updated!' : 'Workout saved!')
        setCurrentWorkout(null)
        setWorkoutStartTime(null)
        setElapsedTime(0)
        try {
          localStorage.removeItem('lifesync_active_workout')
        } catch (err) {
          console.error('Failed to clear active workout after finish:', err)
        }
        return true
      }
    } catch (err) {
      console.error('Failed to save workout:', err)
      toast.error('Failed to save workout')
    }
    return false
  }, [currentWorkout, elapsedTime, token])

  const value = {
    currentWorkout,
    setCurrentWorkout,
    workoutStartTime,
    setWorkoutStartTime,
    elapsedTime,
    setElapsedTime,
    startWorkout,
    cancelWorkout,
    finishWorkout
  }

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
}
