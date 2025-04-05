# {rule_id} Documentation

> **Version**: 1.0.0  
> **Status**: Active  
> **Certification**: Certified  
> **Last Updated**: YYYY-MM-DD

## Summary

This rule enforces standards for {domain}, ensuring all {domain} files meet established best practices and requirements. By implementing this rule, you benefit from:

- [Primary benefit 1]
- [Primary benefit 2]
- [Primary benefit 3]

{Short description of the rule's purpose and significance}

## Fundamental Concepts

### What is {domain}?

{Concise explanation of the primary domain concept}

### Why {domain} Standards Matter

{Explanation of why standards for this domain are important}

### Core Principles

{Outline of the core principles underpinning the rule}

## Principles

The {rule_id} rule is guided by the following key principles:

### Primary Goals

| Goal     | Description   | Priority |
| -------- | ------------- | -------- |
| [Goal 1] | [Description] | Highest  |
| [Goal 2] | [Description] | High     |
| [Goal 3] | [Description] | Medium   |

### Design Principles

| Principle     | Description   | Benefit   |
| ------------- | ------------- | --------- |
| [Principle 1] | [Description] | [Benefit] |
| [Principle 2] | [Description] | [Benefit] |
| [Principle 3] | [Description] | [Benefit] |

## Processes

The rule implements the following cognitive processes:

### Validation Process

```
↹ Ω•validate [p=1] -> (
  check_structure(
    rule_file: ".cursor/rules/{rule_id}.mdc" | for: completeness,
    kb_structure: ".cursor/kb/{rule_id}/" | for: integrity
  )
  → validate_content(
    guidelines: ".cursor/kb/{rule_id}/guidelines/" | for: quality,
    examples: ".cursor/kb/{rule_id}/examples/" | for: relevance
  )
)
Σ validation•process
```

This process validates the structure and content of the rule implementation by:

1. Checking the rule file for completeness
2. Verifying the knowledge base structure integrity
3. Validating the quality of guidelines and relevance of examples

### Ecosystem Creation Process

```
↹ Ω•create_ecosystem [p=1] -> (
  setup_kb_structure(
    base_path: ".cursor/kb/{rule_id}/" | for: organization,
    directories: ["guidelines", "examples", "templates", "references"] | for: completeness
  )
  → generate_kb_content(
    guidelines: "structure_guide.md, implementation_guide.md, best_practices.md" | for: guidance,
    examples: "good_examples.md, bad_examples.md" | for: instruction,
    templates: "implementation_template.md" | for: standardization,
    references: "external_references.yaml" | for: contextualization
  )
  → create_documentation(
    path: ".cursor/documentation/{rule_id}-documentation.md" | for: accessibility,
    sections: ["Summary", "Fundamental Concepts", "Principles", "Processes", "Architecture", "Delegates", "Examples", "Checklist"] | for: comprehensiveness
  )
)
Σ ecosystem_creation•process
```

This process creates a complete rule ecosystem by:

1. Setting up the knowledge base directory structure
2. Generating knowledge base content files
3. Creating comprehensive documentation

## Architecture

The rule's knowledge base is structured as follows:

```
.cursor/kb/{rule_id}/
├── guidelines/
│   ├── structure_guide.md           # Structure and organization guidance
│   ├── implementation_guide.md      # Step-by-step implementation guide
│   └── best_practices.md           # Best practices for rule application
├── examples/
│   ├── good_examples.md            # Examples of correct implementation
│   └── bad_examples.md             # Examples of incorrect implementation
├── templates/
│   └── implementation_template.md  # Template for implementing the rule
└── references/
    └── external_references.yaml    # External reference materials
```

### Key Files and Their Purpose

| File                         | Purpose                                          |
| ---------------------------- | ------------------------------------------------ |
| `structure_guide.md`         | Provides guidance on structural requirements     |
| `implementation_guide.md`    | Offers step-by-step implementation instructions  |
| `best_practices.md`          | Outlines best practices for rule application     |
| `good_examples.md`           | Shows examples of correct rule implementation    |
| `bad_examples.md`            | Demonstrates common mistakes and how to fix them |
| `implementation_template.md` | Provides a template for implementing the rule    |
| `external_references.yaml`   | Lists external reference materials               |

## Delegates

The rule delegates certain responsibilities to the LLM through defined roles:

### Rule Creator

```
↹ LLM•rule_creator [p=1] {
  ⊕ roles {
    architect: "Design rule structure" | focus: organization,
    content_creator: "Generate rule content" | focus: quality
  }

  ⊕ inputs {
    domain: "Rule domain" | for: contextualization,
    requirements: "Rule requirements" | for: guidance
  }

  ⊕ outputs {
    rule_file: "Complete rule file" | with: proper_structure,
    kb_content: "Knowledge base content" | with: comprehensive_guidance
  }
}
Σ llm•rule_creator
```

#### Roles and Responsibilities

| Role            | Description                | Focus        |
| --------------- | -------------------------- | ------------ |
| Architect       | Designs the rule structure | Organization |
| Content Creator | Generates rule content     | Quality      |

#### Inputs and Outputs

| Input/Output | Description            | Purpose                |
| ------------ | ---------------------- | ---------------------- |
| **Inputs**   |                        |                        |
| Domain       | Rule domain            | Contextualization      |
| Requirements | Rule requirements      | Guidance               |
| **Outputs**  |                        |                        |
| Rule File    | Complete rule file     | Proper structure       |
| KB Content   | Knowledge base content | Comprehensive guidance |

## Examples

### Good Example

```
↹ kb•{domain} [p=1] {
  # Knowledge base paths and references
  ⊕ core_kb: ".cursor/kb/core/",
  ⊕ {domain}_kb: ".cursor/kb/{rule_id}/",

  # Domain-specific references
  ⊕ guidelines: {domain}_kb + "guidelines/",
  ⊕ examples: {domain}_kb + "examples/",
  ⊕ templates: {domain}_kb + "templates/",
  ⊕ references: {domain}_kb + "references/"
}
Σ knowledge•references

↹ principles•{domain} [p=1] {
  ⊕ primary•goals [
    clarity: "Ensure code is easily understood" | priority: highest,
    consistency: "Maintain consistent patterns" | priority: high
  ]

  ⊕ design•principles {
    simplicity: "Favor simple solutions" | benefit: maintainability,
    modularity: "Design modular components" | benefit: reusability
  }
}
Σ {domain}•principles

↹ Ω•validate [p=1] -> (
  check_structure(
    rule_file: ".cursor/rules/{rule_id}.mdc" | for: completeness,
    kb_structure: ".cursor/kb/{rule_id}/" | for: integrity
  )
  → validate_content(
    guidelines: ".cursor/kb/{rule_id}/guidelines/" | for: quality,
    examples: ".cursor/kb/{rule_id}/examples/" | for: relevance
  )
)
Σ validation•process

↹ LLM•rule_creator [p=1] {
  ⊕ roles {
    architect: "Design rule structure" | focus: organization,
    content_creator: "Generate rule content" | focus: quality
  }

  ⊕ inputs {
    domain: "Rule domain" | for: contextualization,
    requirements: "Rule requirements" | for: guidance
  }

  ⊕ outputs {
    rule_file: "Complete rule file" | with: proper_structure,
    kb_content: "Knowledge base content" | with: comprehensive_guidance
  }
}
Σ llm•rule_creator

↹ constraints•critical [p=2] {
  ⊕ {domain}•constraints [
    kb_existence: "ALWAYS create required KB files" | priority: highest,
    rule_structure: "ALWAYS follow standard rule structure" | priority: high
  ]
}
Σ critical•constraints

Σ {rule_id} ⊕ {domain} ⊕ quality ⊕ structure
```

### Bad Example

```
↹ kb•{domain} [p=1] {
  ⊕ core_kb: ".cursor/kb/core/",
  ⊕ {domain}_kb: ".cursor/kb/{rule_id}/"
}
Σ knowledge•references

↹ principles•{domain} [p=1] {
  ⊕ primary•goals [
    clarity: "Ensure code is easily understood"
  ]
}
Σ {domain}•principles

↹ LLM•rule_creator [p=1] {
  ⊕ roles {
    content_creator: "Generate rule content"
  }
}
Σ llm•rule_creator

Σ {rule_id}
```

This example is missing several critical components:

- Incomplete knowledge references
- Missing cognitive operations section
- Missing constraints section
- Insufficient principles and LLM delegation details

## Checklist

Use this checklist to ensure your implementation is complete:

### Rule File

- [ ] Knowledge References section with all required paths
- [ ] Principles section with goals and design principles
- [ ] Cognitive Operations section with validation process
- [ ] LLM Delegation section with roles, inputs, and outputs
- [ ] Constraints section with critical constraints
- [ ] Summary section with domains and focuses

### Knowledge Base

- [ ] Guidelines directory with structure guide, implementation guide, and best practices
- [ ] Examples directory with good and bad examples
- [ ] Templates directory with implementation template
- [ ] References directory with external references

### Documentation

- [ ] Summary section with benefits
- [ ] Fundamental Concepts section
- [ ] Principles section with goals and design principles
- [ ] Processes section with validation and ecosystem creation
- [ ] Architecture section with KB structure
- [ ] Delegates section with LLM roles
- [ ] Examples section with good and bad examples
- [ ] Checklist section for implementation verification

## Additional Resources

### External References

- [Reference 1](URL1) - Description 1
- [Reference 2](URL2) - Description 2

### Internal References

- [0000-cursor-rules](/.cursor/rules/0000-cursor-rules.mdc) - Cursor Rules Framework
- [Related Rule](/.cursor/rules/related-rule.mdc) - Related rule

## Version History

| Version | Date       | Changes         |
| ------- | ---------- | --------------- |
| 1.0.0   | YYYY-MM-DD | Initial release |

---

**Certification Status**: Certified  
**Last Validation**: YYYY-MM-DD
