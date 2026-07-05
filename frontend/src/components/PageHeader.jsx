import React from "react";

const PageHeader = ({ eyebrow, title, desc, action }) => (
  <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
    <div>
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="page-title">{title}</h1>
      <p className="page-desc">{desc}</p>
    </div>
    {action}
  </div>
);

export default PageHeader;
