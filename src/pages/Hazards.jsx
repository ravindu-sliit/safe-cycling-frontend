import { useState } from 'react'

const INITIAL_HAZARDS = [
  { id: 1, title: 'Pothole on Main Street', description: 'Large pothole near the intersection causing danger to cyclists. Reported by multiple riders.', location: 'Main St & Oak Ave', severity: 'High', date: '2024-04-07', votes: 24 },
  { id: 2, title: 'Broken Bike Lane', description: 'Bike lane surface is damaged and unsafe. Gravel and debris scattered across the lane.', location: 'Highway 101', severity: 'Medium', date: '2024-04-06', votes: 11 },
  { id: 3, title: 'Low Visibility Crossing', description: 'Overgrown hedges block sightlines at this pedestrian crossing. Risk of collision.', location: 'Park Rd & Elm St', severity: 'Low', date: '2024-04-05', votes: 7 },
]

const SEVERITY_CLASS = { High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' }

function SeverityBadge({ severity }) {
  return <span className={`badge ${SEVERITY_CLASS[severity] ?? 'badge-low'}`}>{severity}</span>
}

function IconLocation() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconThumbUp() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 001.98-1.67l1.38-9a2 2 0 00-1.98-2.33H14z" />
      <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function Hazards() {
  const [hazards, setHazards] = useState(INITIAL_HAZARDS)
  const [filter, setFilter] = useState('All')

  const filtered = filter === 'All' ? hazards : hazards.filter(h => h.severity === filter)
  const upvote = (id) => setHazards(prev => prev.map(h => h.id === id ? { ...h, votes: h.votes + 1 } : h))

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Cycling Hazards</h1>
            <p>Report and track cycling hazards in your area. Help keep riders safe.</p>
          </div>
          <button className="btn btn-primary">
            <IconPlus /> Report Hazard
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        {['All', 'High', 'Medium', 'Low'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-pill${filter === f ? ' active' : ''}`}
          >
            {f}
          </button>
        ))}
        <span className="filter-count">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Cards grid */}
      <div className="hazard-grid">
        {filtered.map(hazard => (
          <div key={hazard.id} className="card card-col">
            <div className="card-body card-body-grow">
              <div className="card-title-row">
                <h3 className="card-title">{hazard.title}</h3>
                <SeverityBadge severity={hazard.severity} />
              </div>
              <p className="card-desc">{hazard.description}</p>
              <div className="card-meta">
                <div className="meta-row">
                  <IconLocation /> {hazard.location}
                </div>
                <div className="meta-row">
                  <IconCalendar /> {hazard.date}
                </div>
              </div>
            </div>

            <div className="card-footer">
              <button onClick={() => upvote(hazard.id)} className="btn btn-ghost btn-sm">
                <IconThumbUp /> {hazard.votes} upvotes
              </button>
              <button className="btn btn-ghost btn-sm">View details →</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🚲</div>
          <p>No {filter.toLowerCase()} hazards found.</p>
        </div>
      )}
    </div>
  )
}
