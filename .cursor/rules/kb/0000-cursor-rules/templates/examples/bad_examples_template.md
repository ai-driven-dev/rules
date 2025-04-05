# Bad Examples of `{rule_id}` Implementation

This document provides examples of incorrect implementation of the `{rule_id}` rule. These examples highlight common mistakes and anti-patterns to avoid.

## Example 1: Incomplete Rule Structure

### Bad Implementation

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

### Why This Is Bad

- **Missing Sections**: Does not include the Cognitive Operations and Constraints sections
- **Incomplete Knowledge References**: Missing references to guidelines, examples, templates, and references
- **Insufficient Principles**: Only includes one goal without priority and no design principles
- **Incomplete LLM Delegation**: Missing inputs and outputs for the LLM role
- **Minimal Summary**: Summary lacks domain integrations and specific focuses
- **No Validation Process**: No process defined for validating the rule implementation

### How to Fix It

Ensure all required sections are included with complete content:

- Add the missing Cognitive Operations and Constraints sections
- Complete the knowledge references with all required paths
- Expand principles to include priorities and design principles with benefits
- Define inputs and outputs for LLM delegation
- Enhance the summary with domain integrations
- Add a validation process

## Example 2: Missing Knowledge Base Structure

### Bad Implementation

The rule file exists but the knowledge base structure is incomplete:

```
.cursor/kb/{rule_id}/
└── guidelines/
    └── structure_guide.md
```

### Why This Is Bad

- **Incomplete Directory Structure**: Missing examples, templates, and references directories
- **Missing Files**: Even the guidelines directory only has one file
- **No Documentation**: No documentation file exists
- **No Validation**: Cannot validate the rule without complete KB structure

### How to Fix It

Create the complete knowledge base structure:

- Add all required directories (examples, templates, references)
- Create all required files in each directory
- Develop comprehensive documentation
- Implement validation mechanisms

## Example 3: Incorrect Syntax and Format

### Bad Implementation

```
↹ kb_{domain} [p=1] {
  core_kb = ".cursor/kb/core/",
  domain_kb = ".cursor/kb/{rule_id}/",

  guidelines = domain_kb + "guidelines/",
  examples = domain_kb + "examples/",
}

↹ principles_{domain} [p=1] {
  primary_goals: [
    "Ensure code is easily understood",
    "Maintain consistent patterns"
  ]

  design_principles: {
    "Favor simple solutions",
    "Design modular components"
  }
}

function validate() {
  check_structure();
  validate_content();
}

class RuleCreator {
  constructor() {
    this.roles = ["architect", "content_creator"];
    this.inputs = ["domain", "requirements"];
    this.outputs = ["rule_file", "kb_content"];
  }
}

constraints = {
  kb_existence: "ALWAYS create required KB files",
  rule_structure: "ALWAYS follow standard rule structure"
}

{rule_id}, {domain}, quality, structure
```

### Why This Is Bad

- **Incorrect Syntax**: Uses incorrect symbols and operators
- **Wrong Naming Convention**: Incorrect naming of cognitive trace elements
- **Inconsistent Format**: Mixes different programming syntaxes
- **No Proper Summation**: Missing Σ operators for section summations
- **Improper Operators**: Uses regular programming constructs instead of Cursor rule operators

### How to Fix It

- Use the correct syntax with ⊕ for additions
- Follow the naming convention with • for concept joining
- Use consistent Cursor rule format
- Include proper Σ summations
- Use the arrow operator → for process steps
- Use the correct notation for constraints and priorities

## Example 4: Insufficient Documentation

### Bad Documentation

```md
# Rule Documentation

This rule enforces {domain} standards.

## How to Use

Just apply the rule to your files.
```

### Why This Is Bad

- **Lacks Required Sections**: Missing most of the required documentation sections
- **Too Brief**: Provides minimal information about the rule
- **No Details**: No explanation of concepts, principles, or processes
- **No Examples**: Does not include examples of rule application
- **No Architecture Description**: No information about the knowledge base structure
- **No Implementation Checklist**: Missing guidance on implementation steps

### How to Fix It

Create comprehensive documentation that includes:

- Clear summary of the rule's purpose and benefits
- Detailed explanation of fundamental concepts
- Description of the principles guiding the rule
- Overview of cognitive processes implemented
- Diagram of the knowledge base architecture
- Description of LLM delegation roles
- Practical examples of rule application
- Implementation checklist with clear steps
