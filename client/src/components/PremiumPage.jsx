import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CheckIcon from '@mui/icons-material/Check'
import StarIcon from '@mui/icons-material/Star'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import LockIcon from '@mui/icons-material/Lock'
import { useAuth } from '../context/AuthContext'
import { API_BASE } from '../config'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Basic habit tracking',
      'Manual food logging',
      'Wellness check-ins',
      'Basic workout logging',
      '7-day data history',
      'Limited AI responses (10/day)',
    ],
    limitations: [
      'No advanced analytics',
      'No integrations',
      'No export data',
    ],
    color: '#6b7280',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    description: 'For serious wellness enthusiasts',
    features: [
      'Everything in Free',
      'Unlimited AI coaching',
      'Advanced analytics & insights',
      'Nutrition database access',
      'Unlimited data history',
      'Weekly email reports',
      'Priority support',
      'Data export (CSV/JSON)',
    ],
    limitations: [],
    color: '#6366f1',
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: 'month',
    description: 'The complete wellness experience',
    features: [
      'Everything in Pro',
      'Apple Health / Google Fit sync',
      'Wearable integrations',
      'Custom AI personality',
      'Family sharing (up to 5)',
      'Personal wellness coach calls',
      'Early access to features',
      'White-glove onboarding',
    ],
    limitations: [],
    color: '#171717',
    popular: false,
  },
]

const PREMIUM_FEATURES = [
  {
    icon: '🤖',
    title: 'Unlimited AI Coaching',
    description: 'Get personalized advice anytime, no daily limits',
    plan: 'pro',
  },
  {
    icon: '📊',
    title: 'Advanced Analytics',
    description: 'Deep insights into your patterns and progress',
    plan: 'pro',
  },
  {
    icon: '📱',
    title: 'Device Sync',
    description: 'Connect Apple Watch, Fitbit, Garmin and more',
    plan: 'premium',
  },
  {
    icon: '👨‍👩‍👧‍👦',
    title: 'Family Sharing',
    description: 'Share your subscription with loved ones',
    plan: 'premium',
  },
  {
    icon: '📧',
    title: 'Weekly Reports',
    description: 'Detailed progress summaries in your inbox',
    plan: 'pro',
  },
  {
    icon: '🎯',
    title: 'Custom Goals',
    description: 'Set and track personalized wellness targets',
    plan: 'pro',
  },
]

function PremiumPage() {
  const { user, token, refreshUser } = useAuth()
  const [upgradeDialog, setUpgradeDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [processing, setProcessing] = useState(false)

  const currentPlan = user?.subscription?.plan || 'free'

  const handleUpgrade = (planId) => {
    setSelectedPlan(PLANS.find(p => p.id === planId))
    setUpgradeDialog(true)
  }

  const processUpgrade = async () => {
    setProcessing(true)
    try {
      // In production, this would integrate with Stripe
      const res = await fetch(`${API_BASE}/api/users/subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan: selectedPlan.id,
          // In production: paymentMethodId from Stripe
        }),
      })

      if (res.ok) {
        await refreshUser()
        setUpgradeDialog(false)
        alert('🎉 Welcome to ' + selectedPlan.name + '!')
      }
    } catch (err) {
      console.error('Upgrade failed:', err)
    }
    setProcessing(false)
  }

  const isPlanActive = (planId) => {
    const planOrder = ['free', 'pro', 'premium']
    return planOrder.indexOf(currentPlan) >= planOrder.indexOf(planId)
  }

  return (
    <Box sx={{ maxWidth: 900 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            bgcolor: '#fef3c7',
            borderRadius: 5,
            mb: 2,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 16, color: '#d97706' }} />
          <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600 }}>
            UPGRADE YOUR WELLNESS
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Choose Your Plan
        </Typography>
        <Typography variant="body1" sx={{ color: '#6b7280' }}>
          Unlock the full potential of your wellness journey
        </Typography>
      </Box>

      {/* Current Plan Badge */}
      {currentPlan !== 'free' && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            p: 2,
            mb: 4,
            bgcolor: '#f0fdf4',
            borderRadius: 2,
            border: '1px solid #bbf7d0',
          }}
        >
          <StarIcon sx={{ color: '#15803d' }} />
          <Typography variant="body2" sx={{ color: '#166534', fontWeight: 500 }}>
            You're on the {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} plan
          </Typography>
        </Box>
      )}

      {/* Pricing Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
          gap: 3,
          mb: 6,
        }}
      >
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            sx={{
              border: plan.popular ? '2px solid #6366f1' : '1px solid #e5e7eb',
              boxShadow: plan.popular ? 3 : 'none',
              position: 'relative',
              overflow: 'visible',
            }}
          >
            {plan.popular && (
              <Chip
                label="Most Popular"
                size="small"
                sx={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  bgcolor: '#6366f1',
                  color: '#fff',
                  fontWeight: 600,
                }}
              />
            )}
            <CardContent sx={{ p: 3 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 600, color: plan.color, mb: 0.5 }}
              >
                {plan.name}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6b7280' }}>
                {plan.description}
              </Typography>

              <Box sx={{ my: 3 }}>
                <Typography
                  variant="h3"
                  component="span"
                  sx={{ fontWeight: 700 }}
                >
                  ${plan.price}
                </Typography>
                {plan.price > 0 && (
                  <Typography
                    variant="body2"
                    component="span"
                    sx={{ color: '#6b7280' }}
                  >
                    /{plan.period}
                  </Typography>
                )}
              </Box>

              <Box sx={{ mb: 3 }}>
                {plan.features.map((feature, idx) => (
                  <Box
                    key={idx}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                  >
                    <CheckIcon sx={{ fontSize: 18, color: '#15803d' }} />
                    <Typography variant="body2" sx={{ color: '#374151' }}>
                      {feature}
                    </Typography>
                  </Box>
                ))}
                {plan.limitations.map((limit, idx) => (
                  <Box
                    key={idx}
                    sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                  >
                    <LockIcon sx={{ fontSize: 18, color: '#d1d5db' }} />
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      {limit}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Button
                fullWidth
                variant={isPlanActive(plan.id) ? 'outlined' : 'contained'}
                disabled={isPlanActive(plan.id)}
                onClick={() => handleUpgrade(plan.id)}
                sx={{
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                  ...(isPlanActive(plan.id)
                    ? {
                        borderColor: '#e5e7eb',
                        color: '#9ca3af',
                      }
                    : {
                        bgcolor: plan.color,
                        '&:hover': { bgcolor: plan.color, opacity: 0.9 },
                      }),
                }}
              >
                {isPlanActive(plan.id)
                  ? plan.id === currentPlan
                    ? 'Current Plan'
                    : 'Included'
                  : `Upgrade to ${plan.name}`}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Premium Features Grid */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
        Premium Features
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        {PREMIUM_FEATURES.map((feature, idx) => (
          <Box
            key={idx}
            sx={{
              p: 3,
              bgcolor: '#fff',
              borderRadius: 2,
              border: '1px solid #e5e7eb',
            }}
          >
            <Typography variant="h5" sx={{ mb: 1 }}>
              {feature.icon}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {feature.title}
            </Typography>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              {feature.description}
            </Typography>
            <Chip
              label={feature.plan.toUpperCase()}
              size="small"
              sx={{
                mt: 1,
                bgcolor: feature.plan === 'premium' ? '#171717' : '#6366f1',
                color: '#fff',
                fontSize: '0.65rem',
              }}
            />
          </Box>
        ))}
      </Box>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialog} onClose={() => setUpgradeDialog(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>
          Upgrade to {selectedPlan?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body2" sx={{ mb: 3, color: '#6b7280' }}>
              You're about to upgrade to the {selectedPlan?.name} plan for ${selectedPlan?.price}/{selectedPlan?.period}.
            </Typography>

            <Box
              sx={{
                p: 3,
                bgcolor: '#f9fafb',
                borderRadius: 2,
                border: '1px solid #e5e7eb',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>
                What you'll get:
              </Typography>
              {selectedPlan?.features.slice(0, 5).map((feature, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <CheckIcon sx={{ fontSize: 16, color: '#15803d' }} />
                  <Typography variant="caption">{feature}</Typography>
                </Box>
              ))}
            </Box>

            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#9ca3af' }}>
              * In demo mode, this simulates the upgrade. In production, this would integrate with Stripe for secure payments.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setUpgradeDialog(false)}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={processUpgrade}
            disabled={processing}
            startIcon={<RocketLaunchIcon />}
            sx={{
              bgcolor: '#171717',
              textTransform: 'none',
              '&:hover': { bgcolor: '#374151' },
            }}
          >
            {processing ? 'Processing...' : 'Confirm Upgrade'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PremiumPage
