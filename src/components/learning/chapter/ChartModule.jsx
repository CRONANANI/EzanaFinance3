'use client';

import CourseVisual from '@/components/learning/visuals/CourseVisual';

export function ChartModule({ visualType, data, eyebrow, title, sub }) {
  return (
    <div className="lc-edit-chart">
      <div className="lc-edit-chart-header">
        <div>
          {eyebrow && (
            <div className="lc-edit-chart-eyebrow">
              <i className="bi bi-diamond-fill" /> {eyebrow}
            </div>
          )}
          {title && <h3 className="lc-edit-chart-title">{title}</h3>}
          {sub && <p className="lc-edit-chart-sub">{sub}</p>}
        </div>
        <span className="lc-edit-chart-hint">
          <i className="bi bi-eye" /> Interactive · hover any point
        </span>
      </div>
      <div className="lc-edit-chart-canvas">
        <CourseVisual type={visualType} data={data} caption={null} />
      </div>
    </div>
  );
}
