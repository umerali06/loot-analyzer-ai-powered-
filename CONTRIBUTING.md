# Contributing to SIBI Lot Analyzer

Thank you for your interest in contributing to the SIBI Lot Analyzer project! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### 1. **Getting Started**
- Fork the repository
- Clone your fork locally
- Install dependencies: `npm install`
- Create a feature branch: `git checkout -b feature/your-feature-name`

### 2. **Development Setup**
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development server
npm run dev
```

### 3. **Code Standards**
- **TypeScript**: All new code must be in TypeScript
- **ESLint**: Follow the configured linting rules
- **Prettier**: Use consistent code formatting
- **Testing**: Add tests for new features

### 4. **Commit Guidelines**
Use conventional commits:
```
feat: add new AI vision enhancement
fix: resolve progress bar stuck issue
docs: update API documentation
style: format code with prettier
refactor: optimize eBay service performance
test: add unit tests for statistics module
```

### 5. **Pull Request Process**
1. Update documentation if needed
2. Add tests for new functionality
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Submit PR with clear description

## 📋 **Development Guidelines**

### **Code Quality**
- Write self-documenting code
- Add JSDoc comments for functions
- Use meaningful variable names
- Keep functions small and focused

### **Performance**
- Optimize for <45 second analysis times
- Use parallel processing where possible
- Implement proper error handling
- Add progress tracking for long operations

### **Security**
- Never commit API keys or secrets
- Validate all user inputs
- Use environment variables for configuration
- Implement proper authentication

## 🐛 **Reporting Issues**

### **Bug Reports**
Please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment information
- Screenshots if applicable

### **Feature Requests**
Please include:
- Clear description of the feature
- Use case and benefits
- Proposed implementation approach
- Any relevant examples

## 📞 **Getting Help**

- **GitHub Discussions**: For general questions
- **GitHub Issues**: For bugs and feature requests
- **Email**: support@lot-analyzer.com

## 🙏 **Recognition**

Contributors will be added to the CONTRIBUTORS.md file and acknowledged in release notes.

Thank you for helping make SIBI Lot Analyzer better!

