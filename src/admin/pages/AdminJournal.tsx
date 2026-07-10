import { useState } from "react";
import { useAdmin } from "../AdminContext";
import { Modal } from "../components/Modal";
import { type JournalArticle } from "../../data";
import { Plus, Edit2, Trash2 } from "lucide-react";

export default function AdminJournal() {
  const { journal, addJournalArticle, updateJournalArticle, deleteJournalArticle } = useAdmin();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<JournalArticle | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    date: "",
    image: "",
    readTime: "",
    excerpt: "",
    content: ""
  });

  const handleAddClick = () => {
    setEditingArticle(null);
    setFormData({ title: "", date: new Date().toISOString().split('T')[0], image: "", readTime: "", excerpt: "", content: "" });
    setIsModalOpen(true);
  };

  const handleEditClick = (article: JournalArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      date: article.date,
      image: article.image,
      readTime: article.readTime,
      excerpt: article.excerpt,
      content: Array.isArray(article.content) ? article.content.join("\n\n") : article.content
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number, title: string) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteJournalArticle(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Split content textarea into paragraphs array
    const contentArray = formData.content.split(/\n+/).filter(Boolean);
    const articleData = {
      title: formData.title,
      date: formData.date,
      image: formData.image,
      readTime: formData.readTime || "5 min read",
      excerpt: formData.excerpt,
      content: contentArray,
    };
    if (editingArticle) {
      updateJournalArticle({ ...articleData, id: editingArticle.id });
    } else {
      addJournalArticle(articleData);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Journal</h1>
          <p>Manage blog posts and editorials.</p>
        </div>
        <button onClick={handleAddClick} className="admin-btn admin-btn-primary">
          <Plus size={16} /> New Article
        </button>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-content p-0">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: "80px" }}>Image</th>
                <th>Title</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {journal.map(article => (
                <tr key={article.id}>
                  <td>
                    <img src={article.image} alt={article.title} className="admin-table-img-wide" />
                  </td>
                  <td><strong>{article.title}</strong></td>
                  <td>{new Date(article.date).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="admin-table-actions">
                      <button onClick={() => handleEditClick(article)} title="Edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(article.id, article.title)} className="text-danger" title="Delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingArticle ? "Edit Article" : "New Article"}
      >
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label>Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              required 
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label>Read Time</label>
              <input
                type="text"
                value={formData.readTime}
                onChange={e => setFormData({...formData, readTime: e.target.value})}
                placeholder="e.g. 5 min read"
              />
            </div>
            <div className="admin-form-group">
              <label>Publish Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label>Cover Image URL</label>
            <input 
              type="url" 
              value={formData.image} 
              onChange={e => setFormData({...formData, image: e.target.value})} 
              required 
            />
          </div>

          <div className="admin-form-group">
            <label>Excerpt (Short description)</label>
            <textarea 
              value={formData.excerpt} 
              onChange={e => setFormData({...formData, excerpt: e.target.value})} 
              rows={2} 
              required 
            />
          </div>

          <div className="admin-form-group">
            <label>Full Content</label>
            <textarea 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              rows={8} 
              required 
              placeholder="Use paragraphs to format text..."
            />
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={() => setIsModalOpen(false)} className="admin-btn admin-btn-secondary">Cancel</button>
            <button type="submit" className="admin-btn admin-btn-primary">
              {editingArticle ? "Save Changes" : "Publish Article"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
