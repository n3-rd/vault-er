# Vault-er

A minimal desktop vault for decentralized file storage built with SvelteKit + Tauri. Store and share files securely using [Storacha](https://storacha.network/), with local-first architecture and a clean, modern UI.

![Vault-er Demo](https://img.shields.io/badge/version-0.1.0-blue) ![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🔐 Decentralized Authentication**: Magic link email authentication with Storacha
- **📁 Space Management**: Create and organize files in secure, decentralized spaces
- **📤 Drag & Drop Uploads**: Native desktop drag-and-drop with dedicated dropzone window
- **🔍 File Search & Discovery**: Search through your stored files with a powerful search interface
- **📱 QR Code Sharing**: Generate QR codes to share files securely
- **💾 Local-First Storage**: Files are indexed locally with Dexie for fast access
- **🎨 Modern UI**: Clean, responsive interface built with Tailwind CSS
- **🚀 Cross-Platform**: Runs on Windows, macOS, and Linux

## 🏗️ Architecture

- **Frontend**: SvelteKit (Svelte 5) + TypeScript + Tailwind CSS 4
- **Backend**: Tauri 2 (Rust) for native desktop functionality
- **Storage**: Storacha (IPFS-based decentralized storage)
- **Database**: Dexie (IndexedDB wrapper) for local file indexing
- **UI Components**: Bits UI + Lucide icons

## 📋 Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher
- **Rust**: v1.70.0 or higher (latest stable recommended)
- **Platform Tools**:
  - **Windows**: Visual Studio Build Tools or Visual Studio Community
  - **macOS**: Xcode Command Line Tools
  - **Linux**: GCC and development packages


## 🚀 Installation & Development

### Clone the Repository
```bash
git clone https://github.com/n3-rd/vault-er.git
cd vault-er
```

### Install Dependencies
```bash
npm install
```

### Development Mode
```bash
# Start both frontend (Vite) and backend (Tauri) in development mode
npm run tauri dev
```

This will:
- Start the Vite dev server on `http://localhost:1420`
- Launch the Tauri desktop application
- Enable hot reloading for both frontend and backend changes

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview built frontend |
| `npm run tauri dev` | Start full development environment |
| `npm run tauri build` | Build desktop application for distribution |
| `npm run check` | Type check with svelte-check |
| `npm run check:watch` | Type check in watch mode |

## 📦 Building for Distribution

### Desktop Application
```bash
# Build for your current platform
npm run tauri build

# Build for all platforms (requires appropriate tooling)
npm run tauri build -- --target universal-apple-darwin  # macOS Universal
npm run tauri build -- --target x86_64-pc-windows-msvc   # Windows x64
npm run tauri build -- --target x86_64-unknown-linux-gnu # Linux x64
```

Built applications will be available in `src-tauri/target/release/bundle/`.

### Web Version (Experimental)
```bash
npm run build
npm run preview
```

## 🏃‍♂️ How to Use

### First Time Setup
1. Launch Vault-er
2. Click "Login" and enter your email
3. Check your email for a magic link
4. Click the link to authenticate with Storacha

### Creating Your First Space
1. Navigate to the dashboard
2. Click "New Space"
3. Enter a name or leave blank for auto-generation
4. Your space is now ready for file uploads

### Uploading Files
1. **Drag & Drop**: Drag files onto the dropzone window
2. **File Picker**: Click to browse and select files
3. **Space Selection**: Choose which space to upload to
4. Files are automatically uploaded to decentralized storage

### Sharing Files
1. Select a file in your space
2. Click the share button to generate a QR code
3. Others can scan the QR code to access the file

### Searching Files
1. Click the search icon in the top navigation
2. Enter search terms to find files across all spaces
3. Results update in real-time as you type

## 🔧 Configuration

### Tauri Configuration
Edit `src-tauri/tauri.conf.json` to customize:
- Window dimensions and behavior
- Bundle settings
- Plugin configurations

## 🧪 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow Svelte 5 patterns and best practices
- Use Tailwind CSS for styling
- Maintain consistent component structure
- Drop useful comments to guide future contributors

### Project Structure
```
src/
├── app.css              # Global styles
├── app.html             # HTML template
├── components/          # Reusable Svelte components
│   ├── ui/             # UI component library
│   └── dashboard/      # Dashboard-specific components
├── lib/                # Utilities and stores
│   ├── auth.ts         # Authentication logic
│   ├── db.ts           # Local database setup
│   └── stores/         # Svelte stores
└── routes/             # SvelteKit routes

src-tauri/              # Tauri Rust backend
├── src/
│   ├── main.rs         # Application entry point
│   └── lib.rs          # Tauri commands and setup
└── tauri.conf.json     # Tauri configuration
```

### Adding New Features
1. **UI Components**: Add to `src/components/ui/`
2. **Business Logic**: Add utilities to `src/lib/`
3. **Tauri Commands**: Add to `src-tauri/src/lib.rs`
4. **Routes**: Create new pages in `src/routes/`

## 🐛 Troubleshooting

### Common Issues

**Build fails on Windows**
- Ensure Visual Studio Build Tools are installed
- Try running as Administrator: `npm run tauri build`

**Hot reload not working**
- Check that both Vite and Tauri processes are running
- Restart with `npm run tauri dev`

**Authentication not working**
- Verify internet connection
- Check that emails are not going to spam
- Try using a different email provider

**File uploads failing**
- Ensure sufficient disk space
- Check network connectivity
- Verify space permissions

### Getting Help
- Check existing [GitHub Issues](https://github.com/n3-rd/vault-er/issues)
- Create a new issue with detailed error logs
- Include your platform, Node.js/Rust versions, and reproduction steps

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit with clear messages: `git commit -m 'Add amazing feature'`
5. Push to your branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Development Setup for Contributors
```bash
# Install all dependencies
npm install

# Run type checking in watch mode
npm run check:watch

# Format code (if prettier is configured)
npm run format
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Storacha](https://storacha.network/) for decentralized storage infrastructure
- [SvelteKit](https://kit.svelte.dev/) for the amazing framework
- [Tauri](https://tauri.app/) for enabling native desktop apps with web technologies
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling

---

**Built with ❤️ using modern web technologies**
