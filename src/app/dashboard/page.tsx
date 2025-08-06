"use client"

import React from "react"
import { motion } from "framer-motion"
import { 
  TrendingUp, 
  DollarSign, 
  Target, 
  Calendar,
  Award,
  Users,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react"
import CountUp from "react-countup"

// Mock data for dashboard stats
const stats = [
  {
    title: "Total Applications",
    value: 24,
    change: "+12%",
    positive: true,
    icon: FileText,
    color: "from-blue-600 to-cyan-600"
  },
  {
    title: "Success Rate",
    value: 87,
    suffix: "%",
    change: "+5%",
    positive: true,
    icon: Target,
    color: "from-green-600 to-emerald-600"
  },
  {
    title: "Total Funding",
    value: 2840000,
    prefix: "$",
    change: "+23%",
    positive: true,
    icon: DollarSign,
    color: "from-purple-600 to-pink-600"
  },
  {
    title: "Active Grants",
    value: 156,
    change: "+8%",
    positive: true,
    icon: Award,
    color: "from-orange-600 to-red-600"
  }
]

const recentApplications = [
  {
    id: 1,
    title: "Innovation in Sustainability Grant",
    amount: 250000,
    status: "approved",
    deadline: "2025-03-15",
    probability: 94
  },
  {
    id: 2,
    title: "Community Development Fund",
    amount: 150000,
    status: "pending",
    deadline: "2025-02-28",
    probability: 88
  },
  {
    id: 3,
    title: "Technology Advancement Initiative",
    amount: 500000,
    status: "in_review",
    deadline: "2025-04-30",
    probability: 82
  },
  {
    id: 4,
    title: "Education Excellence Program",
    amount: 75000,
    status: "rejected",
    deadline: "2025-02-15",
    probability: 65
  }
]

const upcomingDeadlines = [
  {
    title: "Research Innovation Grant",
    deadline: "2025-02-28",
    daysLeft: 23,
    priority: "high"
  },
  {
    title: "Community Impact Fund",
    deadline: "2025-03-15",
    daysLeft: 38,
    priority: "medium"
  },
  {
    title: "Technology Development Grant",
    deadline: "2025-04-01",
    daysLeft: 55,
    priority: "low"
  }
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'pending':
      return <Clock className="w-4 h-4 text-yellow-400" />
    case 'in_review':
      return <Clock className="w-4 h-4 text-blue-400" />
    case 'rejected':
      return <AlertCircle className="w-4 h-4 text-red-400" />
    default:
      return <Clock className="w-4 h-4 text-gray-400" />
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'text-green-400 bg-green-400/10'
    case 'pending':
      return 'text-yellow-400 bg-yellow-400/10'
    case 'in_review':
      return 'text-blue-400 bg-blue-400/10'
    case 'rejected':
      return 'text-red-400 bg-red-400/10'
    default:
      return 'text-gray-400 bg-gray-400/10'
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high':
      return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'medium':
      return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    case 'low':
      return 'text-green-400 bg-green-400/10 border-green-400/20'
    default:
      return 'text-gray-400 bg-gray-400/10 border-gray-400/20'
  }
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back! 👋
            </h1>
            <p className="text-white/70">
              Here's what's happening with your grant applications today.
            </p>
          </div>
          <div className="hidden md:block">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-blue-300 font-medium">All systems operational</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -2 }}
            className="relative group"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} rounded-2xl blur-xl group-hover:blur-2xl transition-all opacity-20 group-hover:opacity-30`} />
            <div className="relative glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  stat.positive ? 'text-green-400' : 'text-red-400'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-white/60 text-sm">{stat.title}</p>
                <p className="text-2xl font-bold text-white">
                  {stat.prefix}
                  <CountUp 
                    end={stat.value} 
                    duration={2} 
                    separator="," 
                  />
                  {stat.suffix}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Recent Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2 glass rounded-3xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Recent Applications
            </h2>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
              View all
            </button>
          </div>

          <div className="space-y-4">
            {recentApplications.map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                        {app.title}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                        {getStatusIcon(app.status)}
                        {app.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span>{formatCurrency(app.amount)}</span>
                      <span>Due: {app.deadline}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{app.probability}%</div>
                    <div className="text-xs text-white/60">success rate</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-3xl p-8"
        >
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-purple-400" />
            Upcoming Deadlines
          </h2>

          <div className="space-y-4">
            {upcomingDeadlines.map((deadline, index) => (
              <motion.div
                key={deadline.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white text-sm leading-snug">
                    {deadline.title}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(deadline.priority)}`}>
                    {deadline.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/60 text-sm">{deadline.deadline}</span>
                  <span className="text-white font-medium text-sm">
                    {deadline.daysLeft} days left
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          <button className="w-full mt-6 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm font-medium transition-colors">
            View Calendar
          </button>
        </motion.div>
      </div>
    </div>
  )
}