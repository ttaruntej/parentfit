import React from 'react';
import microWorkoutsImg from '../assets/content/micro_workouts.jpg';
import dadStrengthImg from '../assets/content/dad_strength.jpg';
import nutritionImg from '../assets/content/nutrition.jpg';
import familyFitnessImg from '../assets/content/family_fitness.jpg';

const knowledgeItems = [
  {
    title: 'Micro-Workouts',
    desc: '5-15 min bursts for busy schedules. No gym required.',
    tag: 'Efficiency',
    img: microWorkoutsImg,
  },
  {
    title: 'Functional Dad Strength',
    desc: 'Compound lifts to make parenting effortless.',
    tag: 'Strength',
    img: dadStrengthImg,
  },
  {
    title: 'Energy Nutrition',
    desc: 'Fuel your day with protein-focused meal prep.',
    tag: 'Nutrition',
    img: nutritionImg,
  },
  {
    title: 'Family Adventure',
    desc: 'Turn outdoor time into a family fitness journey.',
    tag: 'Lifestyle',
    img: familyFitnessImg,
  },
];

function KnowledgeCard({ title, desc, tag, img }) {
  return (
    <div className="content-card">
      <img src={img} alt={title} className="content-card-img" loading="lazy" decoding="async" />
      <div className="content-card-overlay">
        <div className="content-card-tag">{tag}</div>
        <div className="content-card-title">{title}</div>
        <div className="content-card-desc">{desc}</div>
      </div>
    </div>
  );
}

export default function MorePage() {
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div className="section-header">
          <div className="section-title">Knowledge Hub</div>
          <div className="glass-pill">Curated</div>
        </div>
        <div className="knowledge-grid">
          {knowledgeItems.map((item) => (
            <KnowledgeCard key={item.title} {...item} />
          ))}
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '2rem', opacity: 0.6 }}>
        ParentFit - Firebase Sync
      </div>
    </div>
  );
}
