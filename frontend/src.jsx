import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const API = 'http://localhost:5000/api';

async function call(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const response = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const data = await response.json();
  if (!response.ok) throw Error(data.message || 'Request failed');
  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [form, F] = useState({});
  const [err, E] = useState('');
  const [tick, T] = useState(0);

  useEffect(() => {
    if (localStorage.token) {
      call('/auth/me')
        .then(x => setUser(x.user))
        .catch(() => localStorage.clear());
    }
  }, []);

  async function submit(e) {
    e.preventDefault();
    E('');
    try {
      const data = await call('/auth/' + mode, 'POST', form);
      localStorage.token = data.token;
      setUser(data.user);
      F({});
    } catch (error) {
      E(error.message);
    }
  }

  function logout() {
    localStorage.clear();
    setUser(null);
    setMode('login');
  }

  if (!user) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={submit}>
          <div className="brand-mark">SR</div>
          <h1>Store Ratings</h1>
          <p className="muted">Welcome! Please sign in to continue.</p>

          {mode === 'register' && (
            <>
              <Input label="Full Name" k="name" f={form} F={F} />
              <Input label="Address" k="address" f={form} F={F} />
            </>
          )}

          <Input label="Email Address" k="email" f={form} F={F} />
          <Input label="Password" k="password" type="password" f={form} F={F} />

          <p className="error-message">{err}</p>
          <button className="primary-btn full-btn">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="auth-switch"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              E('');
            }}>
            {mode === 'login'
              ? "Don't have an account? Create account"
              : 'Already have an account? Sign in'}
          </p>
        </form>
      </main>
    );
  }

  const role = user.role;
  const title = role === 'ADMIN'
    ? 'Admin Dashboard'
    : role === 'OWNER'
      ? 'Owner Dashboard'
      : 'User Dashboard';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">SR</div>
          <div>
            <strong>StoreRatings</strong>
            <small>Management Portal</small>
          </div>
        </div>

        <p className="nav-heading">MAIN MENU</p>

        <nav className="side-nav">
          <a className="nav-link active" href="#dashboard">
            <span>▦</span> Dashboard
          </a>

          {role === 'USER' && (
            <>
              <a className="nav-link" href="#stores">
                <span>▣</span> Browse Stores
              </a>
              <a className="nav-link" href="#password">
                <span>⚙</span> Settings
              </a>
            </>
          )}

          {role === 'ADMIN' && (
            <>
              <a className="nav-link" href="#users">
                <span>♙</span> Users
              </a>
              <a className="nav-link" href="#stores">
                <span>▣</span> Stores
              </a>
            </>
          )}

          {role === 'OWNER' && (
            <>
              <a className="nav-link" href="#stores">
                <span>▣</span> My Stores
              </a>
              <a className="nav-link" href="#ratings">
                <span>★</span> Customer Reviews
              </a>
              <a className="nav-link" href="#password">
                <span>⚙</span> Settings
              </a>
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div className="profile-info">
              <strong>{user.name}</strong>
              <small>{role}</small>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            ↪ Logout
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{title}</strong>
          </div>
          <div className="top-user">
            <div className="avatar">{user.name?.charAt(0).toUpperCase()}</div>
            <div>
              <strong>{user.name}</strong>
              <small>{role}</small>
            </div>
          </div>
        </header>

        <main className="dashboard-content" id="dashboard">
          <div className="welcome-section">
            <div>
              <p className="eyebrow">OVERVIEW</p>
              <h1>Welcome back, {user.name}!</h1>
              <p className="muted">
                Here's an overview of your Store Ratings workspace.
              </p>
            </div>
          </div>

          {role === 'ADMIN'
            ? <Admin tick={tick} T={T} />
            : role === 'OWNER'
              ? <Owner />
              : <Normal tick={tick} T={T} />}

          <div id="password">
            <Password />
          </div>

          <footer className="footer">
            Store Ratings Management System · Dashboard
          </footer>
        </main>
      </div>
    </div>
  );
}

function Input({ label, k, f, F, type = 'text', required = true }) {
  return (
    <label className="field-label">
      {label}
      <input
        type={type}
        value={f[k] || ''}
        onChange={e => F({ ...f, [k]: e.target.value })}
        required={required}
      />
    </label>
  );
}

function StatCard({ label, value, symbol, color }) {
  return (
    <article className="stat-card">
      <div className={'stat-icon ' + color}>{symbol}</div>
      <div>
        <p>{label}</p>
        <h2>{value}</h2>
      </div>
    </article>
  );
}

function Normal({ tick, T }) {
  const [stores, S] = useState([]);
  const [q, Q] = useState('');
  const [rating, R] = useState({});
  const [msg, M] = useState('');

  useEffect(() => {
    call('/stores?search=' + encodeURIComponent(q))
      .then(x => {
        S(x.stores);
        M('');
      })
      .catch(e => M(e.message));
  }, [q, tick]);

  const rated = stores.filter(s => s.myRating != null);
  const average = rated.length
    ? (rated.reduce((sum, s) => sum + Number(s.myRating), 0) / rated.length).toFixed(1)
    : '—';

  async function saveRating(store) {
    const selected = rating[store.id] ?? store.myRating;

    if (!selected) {
      M('Please select a rating between 1 and 5.');
      return;
    }

    try {
      await call('/ratings', 'POST', {
        storeId: store.id,
        rating: Number(selected)
      });
      M('Rating saved successfully.');
      T(x => x + 1);
    } catch (e) {
      M(e.message);
    }
  }

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Available Stores" value={stores.length} symbol="▣" color="blue" />
        <StatCard label="Your Ratings" value={rated.length} symbol="★" color="purple" />
        <StatCard label="Average Rating Given" value={average} symbol="☆" color="orange" />
      </div>

      <section className="content-card" id="stores">
        <div className="section-heading">
          <div>
            <h2>Explore Stores</h2>
            <p>Find stores and share your experience.</p>
          </div>
          <span className="count-badge">{stores.length} stores</span>
        </div>

        <div className="search-box">
          <span>⌕</span>
          <input
            placeholder="Search by store name or address..."
            value={q}
            onChange={e => Q(e.target.value)}
          />
        </div>

        {msg && <p className="notice">{msg}</p>}

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>STORE NAME</th>
                <th>ADDRESS</th>
                <th>OVERALL RATING</th>
                <th>YOUR RATING</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(s => (
                <tr key={s.id}>
                  <td><strong>{s.name}</strong></td>
                  <td className="address-cell">{s.address}</td>
                  <td>
                    <span className="rating-value">
                      ★ {s.overallRating ?? '—'}
                    </span>
                  </td>
                  <td>
                    {s.myRating != null
                      ? <span className="rating-value">★ {s.myRating}</span>
                      : 'Not rated'}
                  </td>
                  <td>
                    <div className="rating-action">
                      <select
                        value={rating[s.id] ?? s.myRating ?? ''}
                        onChange={e => R({ ...rating, [s.id]: e.target.value })}
                      >
                        <option value="">Rate</option>
                        {[1, 2, 3, 4, 5].map(n => (
                          <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                        ))}
                      </select>
                      <button className="primary-btn small-btn"
                        onClick={() => saveRating(s)}>
                        {s.myRating != null ? 'Update' : 'Submit'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {stores.length === 0 && (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <div>▣</div>
                    <strong>No stores found</strong>
                    <p>Try another search or check back later.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function Admin({ tick, T }) {
  const [stats, A] = useState({});
  const [users, U] = useState([]);
  const [stores, S] = useState([]);
  const [q, Q] = useState('');
  const [u, SU] = useState({ role: 'USER' });
  const [s, SS] = useState({});

  async function load() {
    try {
      A(await call('/admin/stats'));
      U((await call('/admin/users?search=' + encodeURIComponent(q))).users);
      S((await call('/admin/stores?search=' + encodeURIComponent(q))).stores);
    } catch (e) {
      console.error(e.message);
    }
  }

  useEffect(() => { load(); }, [q, tick]);

  async function save(path, obj, reset) {
    try {
      await call(path, 'POST', obj);
      reset({});
      T(x => x + 1);
      alert('Created successfully');
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <>
      <div className="stats-grid">
        {Object.entries(stats).map(([key, value]) => (
          <StatCard key={key} label={key} value={value} symbol="▦" color="blue" />
        ))}
      </div>

      <div className="form-grid">
        <section className="content-card">
          <h2>Create New User</h2>
          <p className="muted">Add a user to the platform.</p>
          <form onSubmit={e => {
            e.preventDefault();
            save('/admin/users', u, SU);
          }}>
            {['name', 'email', 'address', 'password'].map(k => (
              <Input key={k} label={k} k={k} f={u} F={SU}
                type={k === 'password' ? 'password' : 'text'} />
            ))}
            <label className="field-label">
              Role
              <select value={u.role || 'USER'}
                onChange={e => SU({ ...u, role: e.target.value })}>
                <option value="USER">USER</option>
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </label>
            <button className="primary-btn">Create User</button>
          </form>
        </section>

         <section className="content-card">
  <h2>Create New Store</h2>
  <p className="muted">Register a store on the platform.</p>

  <form onSubmit={e => {
    e.preventDefault();

    const storeData = {
      name: s.name,
      email: s.email,
      address: s.address,
      ownerUserId: s.ownerUserId
        ? Number(s.ownerUserId)
        : null
    };

    save('/admin/stores', storeData, SS);
  }}>

    <Input label="Store Name" k="name" f={s} F={SS} />

    <Input label="Store Email" k="email" f={s} F={SS} type="email" />

    <Input label="Store Address" k="address" f={s} F={SS} />

    <Input
      label="Owner User ID (Optional)"
      k="ownerUserId"
      f={s}
      F={SS}
      type="number"
      required={false}
    />

    <button className="primary-btn">
      Create Store
    </button>
  </form>
</section>
      </div>

      <section className="content-card" id="users">
        <div className="section-heading">
          <div>
            <h2>Platform Management</h2>
            <p>Manage registered users and stores.</p>
          </div>
        </div>
        <div className="search-box">
          <span>⌕</span>
          <input placeholder="Search users and stores..."
            value={q} onChange={e => Q(e.target.value)} />
        </div>
        <h3>Users</h3>
        <Table rows={users} cols={['id', 'name', 'email', 'address', 'role']} />
        <h3 id="stores">Stores</h3>
        <Table rows={stores}
          cols={['name', 'email', 'address', 'rating', 'ownerUserId']} />
      </section>
    </>
  );
}

function Table({ rows, cols }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {cols.map(c => <td key={c}>{r[c] ?? '—'}</td>)}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="empty-state">
                No records available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Owner() {
  const [d, D] = useState({ stores: [], ratings: [] });

  useEffect(() => {
    call('/owner/dashboard')
      .then(D)
      .catch(e => alert(e.message));
  }, []);

  const average = d.stores.length
    ? d.stores.map(s => s.averageRating).filter(x => x != null)
    : [];

  return (
    <>
      <div className="stats-grid">
        <StatCard label="Your Stores" value={d.stores.length} symbol="▣" color="blue" />
        <StatCard label="Submitted Ratings" value={d.ratings.length} symbol="★" color="purple" />
        <StatCard label="Stores With Ratings" value={average.length} symbol="☆" color="orange" />
      </div>

      <section className="content-card" id="stores">
        <h2>Your Stores</h2>
        <p className="muted">Monitor your store performance.</p>
        <Table rows={d.stores}
          cols={['name', 'averageRating', 'ratingCount']} />
      </section>

      <section className="content-card" id="ratings">
        <h2>Customer Reviews</h2>
        <p className="muted">Users who submitted ratings for your stores.</p>
        <Table rows={d.ratings}
          cols={['storeName', 'userName', 'email', 'rating', 'submittedAt']} />
      </section>
    </>
  );
}

function Password() {
  const [f, F] = useState({});
  const [m, M] = useState('');

  return (
    <section className="content-card password-card">
      <div className="section-heading">
        <div>
          <h2>Security Settings</h2>
          <p>Keep your account secure by updating your password.</p>
        </div>
        <span className="security-icon">⚙</span>
      </div>

      <form onSubmit={async e => {
        e.preventDefault();
        try {
          const d = await call('/auth/password', 'PUT', f);
          M(d.message);
          F({});
        } catch (x) {
          M(x.message);
        }
      }}>
        <div className="password-fields">
          <Input label="Current Password" k="currentPassword"
            f={f} F={F} type="password" />
          <Input label="New Password" k="newPassword"
            f={f} F={F} type="password" />
        </div>
        <button className="primary-btn">Update Password</button>
      </form>
      {m && <p className="notice">{m}</p>}
    </section>
  );
}

createRoot(document.getElementById('root')).render(<App />);