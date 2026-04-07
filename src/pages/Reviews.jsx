import { useState } from 'react'

const INITIAL_REVIEWS = [
  { id: 1, routeName: 'Scenic River Trail', rating: 5, comment: 'Beautiful trail with amazing views! Perfect for weekend rides. The path is well-maintained and safe for all skill levels. Highly recommended.', author: 'Sarah M.', initials: 'SM', date: '2024-04-07', difficulty: 'Easy', distance: '12 km', likes: 18 },
  { id: 2, routeName: 'Mountain Challenge Loop', rating: 4, comment: 'Great challenging route with steep climbs. The downhill sections are thrilling but be careful on sharp turns. Bring plenty of water.', author: 'Mike R.', initials: 'MR', date: '2024-04-06', difficulty: 'Hard', distance: '28 km', likes: 9 },
  { id: 3, routeName: 'City Commuter Route', rating: 3, comment: 'Decent route for daily commuting but can be crowded during peak hours. Bike lanes are available but need maintenance in some sections.', author: 'Alex T.', initials: 'AT', date: '2024-04-05', difficulty: 'Medium', distance: '8 km', likes: 5 },
]

const AVATAR_CLASSES = ['avatar-green', 'avatar-orange', 'avatar-purple']
const DIFFICULTY_CLASS = { Easy: 'badge-easy', Medium: 'badge-medium', Hard: 'badge-hard' }

function StarRating({ rating }) {
  return (
    <div className="stars">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="16" height="16" viewBox="0 0 20 20" fill={i < rating ? '#f59e0b' : 'var(--border-light)'}>
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function DifficultyBadge({ difficulty }) {
  return <span className={`badge ${DIFFICULTY_CLASS[difficulty] ?? 'badge-easy'}`}>{difficulty}</span>
}

function IconHeart() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></svg>
}
function IconComment() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
}
function IconShare() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
}
function IconPlus() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
}
function IconRoute() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" /><circle cx="18" cy="5" r="3" /></svg>
}

export default function Reviews() {
  const [reviews, setReviews] = useState(INITIAL_REVIEWS)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('newest')

  const filtered = (filter === 'All' ? reviews : reviews.filter(r => r.difficulty === filter))
    .slice().sort((a, b) => sort === 'newest' ? b.id - a.id : b.likes - a.likes)

  const like = (id) => setReviews(prev => prev.map(r => r.id === id ? { ...r, likes: r.likes + 1 } : r))

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Route Reviews</h1>
            <p>Discover and share cycling route experiences with the community.</p>
          </div>
          <button className="btn btn-primary">
            <IconPlus /> Write Review
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="filter-bar">
        {['All', 'Easy', 'Medium', 'Hard'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-pill${filter === f ? ' active' : ''}`}
          >
            {f}
          </button>
        ))}
        <div className="filter-bar-spacer">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest first</option>
            <option value="popular">Most liked</option>
          </select>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="review-summary-grid">
        {[
          { label: 'Total Reviews', value: reviews.length, icon: '📝' },
          { label: 'Avg. Rating', value: (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) + ' ★', icon: '⭐' },
          { label: 'Total Likes', value: reviews.reduce((a, r) => a + r.likes, 0), icon: '❤️' },
        ].map(s => (
          <div key={s.label} className="summary-tile">
            <span className="summary-icon">{s.icon}</span>
            <div>
              <div className="summary-value">{s.value}</div>
              <div className="summary-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Review cards */}
      <div className="review-list">
        {filtered.map((review, i) => (
          <div key={review.id} className="card">
            <div className="card-body">
              <div className="review-row">
                {/* Avatar */}
                <div className={`review-avatar ${AVATAR_CLASSES[i % AVATAR_CLASSES.length]}`}>
                  {review.initials}
                </div>

                {/* Content */}
                <div className="review-content">
                  <div className="review-meta-row">
                    <div>
                      <h3 className="review-route-name">{review.routeName}</h3>
                      <div className="review-tags">
                        <StarRating rating={review.rating} />
                        <DifficultyBadge difficulty={review.difficulty} />
                        <div className="meta-row">
                          <IconRoute /> {review.distance}
                        </div>
                      </div>
                    </div>
                    <div className="review-author-col">
                      <div className="review-author">{review.author}</div>
                      <div className="review-date">{review.date}</div>
                    </div>
                  </div>

                  <p className="review-comment">{review.comment}</p>

                  <div className="review-actions">
                    <button onClick={() => like(review.id)} className="btn btn-ghost btn-sm">
                      <IconHeart /> {review.likes}
                    </button>
                    <button className="btn btn-ghost btn-sm"><IconComment /> Reply</button>
                    <button className="btn btn-ghost btn-sm"><IconShare /> Share</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-emoji">🗺️</div>
          <p>No reviews found for this filter.</p>
        </div>
      )}
    </div>
  )
}
