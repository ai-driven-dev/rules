# Good Examples of `{rule_id}` Implementation

This document provides examples of correct implementation of the `{rule_id}` rule. These examples demonstrate best practices and proper adherence to the rule's requirements.

## Example 1: Basic Implementation

### Rule File

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

### Why This Is Good

- Follows the standard rule structure with all required sections
- Includes clear knowledge references with proper paths
- Defines specific principles with priorities and benefits
- Implements a validation process with clear steps
- Defines LLM delegation roles with inputs and outputs
- Includes critical constraints with priorities
- Ends with a concise summary

## Example 2: Comprehensive Implementation

### Knowledge Base Structure

```
.cursor/kb/{rule_id}/
├── guidelines/
│   ├── structure_guide.md
│   ├── implementation_guide.md
│   └── best_practices.md
├── examples/
│   ├── good_examples.md
│   └── bad_examples.md
├── templates/
│   └── implementation_template.md
└── references/
    └── external_references.yaml
```

### Documentation

A well-structured documentation file includes:

- Clear summary of the rule's purpose
- Detailed explanation of fundamental concepts
- Description of the principles guiding the rule
- Overview of cognitive processes implemented
- Diagram of the knowledge base architecture
- Description of LLM delegation roles
- Practical examples of rule application
- Implementation checklist

### Why This Is Good

- Complete knowledge base structure with all required directories
- Each directory contains the necessary files
- Documentation covers all required sections
- Examples demonstrate proper rule application
- Templates provide clear guidance for implementation

## Example 3: Advanced Implementation

This example shows how to extend the basic implementation with advanced features:

### Enhanced Validation Process

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
  → report_validation(
    format: "markdown" | for: readability,
    include: ["issues", "recommendations"] | for: actionability
  )
  → certify_rule(
    criteria: "certification_criteria.yaml" | for: standardization,
    level: "auto" | for: objectivity
  )
)
Σ enhanced_validation•process
```

### Why This Is Good

- Extends the basic validation process with additional steps
- Includes reporting mechanism for validation results
- Implements certification based on objective criteria
- Maintains the correct syntax and structure
- Provides additional functionality while adhering to rule requirements
