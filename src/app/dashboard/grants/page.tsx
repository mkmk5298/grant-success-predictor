"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  SlidersHorizontal,
  MapPin,
  Calendar,
  DollarSign,
  Building,
  Target,
  TrendingUp,
  Bookmark,
  ExternalLink
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Mock grant data
const allGrants = [
  {
    id: 1,
    title: "Innovation in Sustainability Grant",
    organization: "EPA Environmental Innovation Program",
    amount: { min: 50000, max: 250000 },
    deadline: "2025-03-15",
    location: "National",
    category: "Environmental",
    match: 94,
    description: "Supporting innovative solutions for environmental challenges through technology and community engagement.",
    requirements: ["Non-profit status", "Environmental focus", "Innovation component"],
    tags: ["sustainability", "innovation", "technology"]
  },
  {
    id: 2,
    title: "Community Development Fund",
    organization: "HUD Community Development",
    amount: { min: 25000, max: 150000 },
    deadline: "2025-02-28",
    location: "Local",
    category: "Community",
    match: 88,
    description: "Funding for community-based organizations to improve local infrastructure and services.",
    requirements: ["Community focus", "Local impact", "Measurable outcomes"],
    tags: ["community", "development", "infrastructure"]
  },
  {
    id: 3,
    title: "Technology Advancement Initiative",
    organization: "NSF Technology Division",
    amount: { min: 100000, max: 500000 },
    deadline: "2025-04-30",
    location: "National",
    category: "Technology",
    match: 82,
    description: "Advancing cutting-edge technology research and development in emerging fields.",
    requirements: ["Research institution", "Technology focus", "PhD researchers"],
    tags: ["technology", "research", "innovation"]
  },
  {
    id: 4,
    title: "Education Excellence Program",
    organization: "Department of Education",
    amount: { min: 10000, max: 75000 },
    deadline: "2025-02-15",
    location: "State",
    category: "Education",
    match: 75,
    description: "Supporting educational institutions in developing innovative learning programs.",
    requirements: ["Educational institution", "Student impact", "Innovation in learning"],
    tags: ["education", "learning", "students"]
  },
  {
    id: 5,
    title: "Healthcare Innovation Grant",
    organization: "NIH Innovation Center",
    amount: { min: 75000, max: 300000 },
    deadline: "2025-05-15",
    location: "National",
    category: "Healthcare",
    match: 91,
    description: "Funding breakthrough healthcare solutions and medical technology development.",
    requirements: ["Healthcare focus", "Clinical evidence", "Regulatory compliance"],
    tags: ["healthcare", "medical", "innovation"]
  },
  {
    id: 6,
    title: "Arts & Culture Preservation",
    organization: "National Endowment for the Arts",
    amount: { min: 5000, max: 50000 },
    deadline: "2025-03-31",
    location: "Regional",
    category: "Arts",
    match: 68,
    description: "Preserving and promoting cultural heritage through community arts programs.",
    requirements: ["Arts organization", "Cultural focus", "Community engagement"],
    tags: ["arts", "culture", "heritage"]
  }
]

const categories = [
  "All Categories",
  "Environmental",
  "Technology", 
  "Healthcare",
  "Education",
  "Community",
  "Arts"
]

const locations = [
  "All Locations",
  "National",
  "State",
  "Regional", 
  "Local"
]

const amountRanges = [
  { label: "Any Amount", min: 0, max: Infinity },
  { label: "$0 - $25K", min: 0, max: 25000 },
  { label: "$25K - $100K", min: 25000, max: 100000 },
  { label: "$100K - $500K", min: 100000, max: 500000 },
  { label: "$500K+", min: 500000, max: Infinity }
]

function formatCurrency(amount: number) {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toLocaleString()}`
}

function getMatchColor(match: number) {
  if (match >= 90) return "text-green-400 bg-green-400/10"
  if (match >= 80) return "text-blue-400 bg-blue-400/10"  
  if (match >= 70) return "text-yellow-400 bg-yellow-400/10"
  return "text-red-400 bg-red-400/10"
}

export default function GrantsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")
  const [selectedLocation, setSelectedLocation] = useState("All Locations")
  const [selectedAmountRange, setSelectedAmountRange] = useState(amountRanges[0])
  const [filteredGrants, setFilteredGrants] = useState(allGrants)
  const [showFilters, setShowFilters] = useState(false)
  const [bookmarkedGrants, setBookmarkedGrants] = useState<number[]>([])

  useEffect(() => {
    let filtered = allGrants

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(grant =>
        grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        grant.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter(grant => grant.category === selectedCategory)
    }

    // Location filter
    if (selectedLocation !== "All Locations") {
      filtered = filtered.filter(grant => grant.location === selectedLocation)
    }

    // Amount range filter
    if (selectedAmountRange.label !== "Any Amount") {
      filtered = filtered.filter(grant => 
        grant.amount.max >= selectedAmountRange.min && 
        grant.amount.min <= selectedAmountRange.max
      )
    }

    setFilteredGrants(filtered)
  }, [searchTerm, selectedCategory, selectedLocation, selectedAmountRange])

  const toggleBookmark = (grantId: number) => {
    setBookmarkedGrants(prev => 
      prev.includes(grantId) 
        ? prev.filter(id => id !== grantId)
        : [...prev, grantId]
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Grant Discovery</h1>
            <p className="text-white/70">
              Find the perfect grants for your organization with AI-powered matching
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/20 border border-blue-400/30">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-300 font-medium">{filteredGrants.length} matches found</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/60" />
              <Input
                placeholder="Search grants by title, organization, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="px-6"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Location</label>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">Amount Range</label>
                  <Select 
                    value={selectedAmountRange.label} 
                    onValueChange={(value) => {
                      const range = amountRanges.find(r => r.label === value)
                      if (range) setSelectedAmountRange(range)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {amountRanges.map((range) => (
                        <SelectItem key={range.label} value={range.label}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Results */}
      <div className="grid gap-6">
        <AnimatePresence>
          {filteredGrants.map((grant, index) => (
            <motion.div
              key={grant.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01, y: -2 }}
              className="glass rounded-2xl p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors mb-1">
                        {grant.title}
                      </h3>
                      <p className="text-white/60 text-sm">{grant.organization}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMatchColor(grant.match)}`}>
                      {grant.match}% match
                    </span>
                  </div>
                  
                  <p className="text-white/80 mb-4 leading-relaxed">
                    {grant.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {grant.tags.map((tag) => (
                      <span key={tag} className="px-2 py-1 rounded-md bg-white/5 text-white/70 text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-white/60">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatCurrency(grant.amount.min)} - {formatCurrency(grant.amount.max)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <Calendar className="w-4 h-4" />
                      <span>{grant.deadline}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>{grant.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <Target className="w-4 h-4" />
                      <span>{grant.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`p-2 ${bookmarkedGrants.includes(grant.id) ? 'text-yellow-400' : 'text-white/60'}`}
                    onClick={() => toggleBookmark(grant.id)}
                  >
                    <Bookmark className={`w-4 h-4 ${bookmarkedGrants.includes(grant.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="outline" size="sm" className="px-4">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-white mb-2">Requirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {grant.requirements.slice(0, 3).map((req, idx) => (
                        <span key={idx} className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-300 text-xs">
                          {req}
                        </span>
                      ))}
                      {grant.requirements.length > 3 && (
                        <span className="px-2 py-1 rounded-md bg-white/5 text-white/60 text-xs">
                          +{grant.requirements.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-400">{grant.match}%</div>
                    <div className="text-xs text-white/60">AI Match</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredGrants.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-12 text-center"
          >
            <Search className="w-12 h-12 text-white/40 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No grants found</h3>
            <p className="text-white/60 mb-6">
              Try adjusting your search criteria or filters to find more grants.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm("")
                setSelectedCategory("All Categories")
                setSelectedLocation("All Locations")
                setSelectedAmountRange(amountRanges[0])
              }}
            >
              Clear all filters
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  )
}