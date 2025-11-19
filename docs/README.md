# Documentation Structure

## Quick Reference

### **� Documentation Map**
```
/docs/
├── business/                          # Business & product
│   └── PRD-poco-mvp.md                # Product requirements
├── architecture/                      # Technical design  
│   ├── technical-architecture.md      # Complete tech stack & patterns
│   ├── service-abstractions.md        # Swappable service interfaces
│   └── vercel-platform-analysis.md    # Platform feasibility
├── database/                          # Data architecture
│   ├── schemas.sql                    # Database schemas (MVP + Enterprise)
│   ├── architecture-strategy.md       # Database architecture & implementation strategy
│   └── confidence-assessment.md       # Implementation confidence
└── security/                          # Security & compliance
    └── pii-protection-architecture.md # PII protection design

/copilot-instructions.md               # Development guidelines (project root)
```

### **🎯 Key Documents by Purpose**
| Need | Document |
|------|----------|
| **Business requirements** | `business/PRD-poco-mvp.md` |
| **Tech stack & architecture** | `architecture/technical-architecture.md` |
| **Database design** | `database/schemas.sql` + `database/architecture-strategy.md` |
| **Security compliance** | `security/pii-protection-architecture.md` |
| **Development guidelines** | `/copilot-instructions.md` |

---

## Documentation Principles

### **Self-Contained Files**
Each document provides complete context for its domain:
- ✅ No dependencies on other files to understand the content
- ✅ Clear cross-references when related information exists elsewhere
- ✅ Complete implementation details within each file

### **Single Source of Truth**
- Each concept documented in exactly one place
- No duplication across files
- Clear ownership of each domain area

### **Evolution-Friendly**
- Update existing documents rather than creating new ones
- Mark deprecated sections clearly when approach changes
- Maintain cross-reference integrity when files are moved