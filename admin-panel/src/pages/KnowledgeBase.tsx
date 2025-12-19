import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/Layout/DashboardLayout';
import { FileText, Search, ExternalLink } from 'lucide-react';
import './KnowledgeBase.css';

interface CheatSheet {
  name: string;
  category: string;
  filename: string;
  description: string;
}

// In a real app, this list could be generated dynamically or fetched from an API
// For now, we'll manually list the PDFs we expect to find based on the cheat-sheet-pdf repo content
const CHEAT_SHEETS: CheatSheet[] = [
  { name: 'Docker', category: 'DevOps', filename: 'docker.pdf', description: 'Containerization platform commands and concepts' },
  { name: 'Kubernetes', category: 'DevOps', filename: 'kubernetes.pdf', description: 'Container orchestration system reference' },
  { name: 'Linux', category: 'OS', filename: 'linux.pdf', description: 'Essential Linux command line reference' },
  { name: 'Git', category: 'Version Control', filename: 'git.pdf', description: 'Git version control system commands' },
  { name: 'Python', category: 'Programming', filename: 'python.pdf', description: 'Python programming language reference' },
  { name: 'Ansible', category: 'DevOps', filename: 'ansible.pdf', description: 'Automation and configuration management' },
  { name: 'Terraform', category: 'DevOps', filename: 'terraform.pdf', description: 'Infrastructure as Code (IaC) tool' },
  { name: 'PostgreSQL', category: 'Database', filename: 'postgresql.pdf', description: 'Relational database management system' },
  { name: 'Redis', category: 'Database', filename: 'redis.pdf', description: 'In-memory data structure store' },
  { name: 'Nginx', category: 'Web Server', filename: 'nginx.pdf', description: 'Web server and reverse proxy configuration' },
  { name: 'Jenkins', category: 'CI/CD', filename: 'jenkins.pdf', description: 'Automation server for building and deploying' },
  { name: 'AWS', category: 'Cloud', filename: 'aws.pdf', description: 'Amazon Web Services cloud platform' },
  { name: 'Cyber Security', category: 'Security', filename: 'cyber_security.pdf', description: 'Common security concepts and commands' },
  // Add more as discovered
];

export const KnowledgeBase: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredSheets, setFilteredSheets] = useState(CHEAT_SHEETS);

  useEffect(() => {
    const results = CHEAT_SHEETS.filter(sheet =>
      sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sheet.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSheets(results);
  }, [searchTerm]);

  const handleOpenPdf = (filename: string) => {
    window.open(`/cheat-sheets/${filename}`, '_blank');
  };

  return (
    <DashboardLayout>
      <div className="knowledge-base-page">
        <div className="kb-header">
          <div className="header-content">
            <h1>Knowledge Base</h1>
            <p className="subtitle">Reference documentation and cheat sheets for the team</p>
          </div>
          <div className="search-bar">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search cheat sheets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="sheets-grid">
          {filteredSheets.length > 0 ? (
            filteredSheets.map((sheet) => (
              <div key={sheet.filename} className="sheet-card" onClick={() => handleOpenPdf(sheet.filename)}>
                <div className="card-icon">
                  <FileText size={32} />
                </div>
                <div className="card-content">
                  <div className="card-header">
                    <h3>{sheet.name}</h3>
                    <span className="category-badge">{sheet.category}</span>
                  </div>
                  <p>{sheet.description}</p>
                  <button className="open-btn">
                    View PDF <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="no-results">
              <p>No cheat sheets found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};
