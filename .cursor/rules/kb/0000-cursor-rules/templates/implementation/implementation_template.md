# Implementation Template for `{rule_id}`

This template provides a structured approach for implementing the `{rule_id}` rule. Follow these steps to create a complete rule ecosystem.

## Step 1: Create the Rule File

Create a new file at `.cursor/rules/{rule_id}.mdc` with the following structure:

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
    # Replace with your goals
    goal1: "Description" | priority: highest,
    goal2: "Description" | priority: high
  ]

  ⊕ design•principles {
    # Replace with your principles
    principle1: "Description" | benefit: outcome,
    principle2: "Description" | benefit: outcome
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

↹ LLM•rule_creator [p=1] {
  ⊕ roles {
    # Replace with your roles
    architect: "Description" | focus: specific_focus,
    content_creator: "Description" | focus: specific_focus
  }

  ⊕ inputs {
    # Replace with your inputs
    input1: "Description" | for: purpose,
    input2: "Description" | for: purpose
  }

  ⊕ outputs {
    # Replace with your outputs
    output1: "Description" | with: characteristics,
    output2: "Description" | with: characteristics
  }
}
Σ llm•rule_creator

↹ constraints•critical [p=2] {
  ⊕ {domain}•constraints [
    # Replace with your constraints
    kb_existence: "ALWAYS create required KB files" | priority: highest,
    rule_structure: "ALWAYS follow standard rule structure" | priority: high
  ]
}
Σ critical•constraints

# Replace with your summary
Σ {rule_id} ⊕ {domain} ⊕ quality ⊕ structure
```

## Step 2: Create Knowledge Base Structure

Create the following directory structure:

```
mkdir -p .cursor/kb/{rule_id}/guidelines
mkdir -p .cursor/kb/{rule_id}/examples
mkdir -p .cursor/kb/{rule_id}/templates
mkdir -p .cursor/kb/{rule_id}/references
```

## Step 3: Create Guidelines Files

### Structure Guide

Create `.cursor/kb/{rule_id}/guidelines/structure_guide.md`:

```markdown
# Rule Structure Guide

## Overview

This guide provides a comprehensive overview of the structure for the `{rule_id}` rule.

## Rule File Structure

The rule file (`.cursor/rules/{rule_id}.mdc`) should follow this structure:

1. **Knowledge References Section**

   - Define knowledge base paths and references
   - Include domain-specific references

2. **Principles Section**

   - Define primary goals with priorities
   - Outline design principles with their benefits

3. **Cognitive Operations Section**

   - Define key processes/operations

4. **LLM Delegation Section**

   - Define specialized roles for the LLM
   - Specify inputs and expected outputs for each role

5. **Constraints Section**

   - List critical constraints with priority levels

6. **Summary Section**
   - Concise summary of the rule's domains and integrations

## Knowledge Base Structure

[Describe the knowledge base structure here]

## Documentation Structure

[Describe the documentation structure here]
```

### Implementation Guide

Create `.cursor/kb/{rule_id}/guidelines/implementation_guide.md`:

```markdown
# Implementation Guide

This guide provides step-by-step instructions for implementing the `{rule_id}` rule.

## Prerequisites

[List prerequisites here]

## Implementation Steps

1. **Create Rule File**

   - [Instructions for creating the rule file]

2. **Set Up Knowledge Base**

   - [Instructions for setting up the knowledge base]

3. **Generate Documentation**

   - [Instructions for generating documentation]

4. **Validate Implementation**
   - [Instructions for validating the implementation]

## Tips and Best Practices

[Include tips and best practices here]
```

### Best Practices

Create `.cursor/kb/{rule_id}/guidelines/best_practices.md`:

```markdown
# Best Practices

This document outlines best practices for implementing and using the `{rule_id}` rule.

## Design Principles

[List design principles here]

## Implementation Practices

[List implementation practices here]

## Common Pitfalls to Avoid

[List common pitfalls here]

## Optimization Techniques

[List optimization techniques here]
```

## Step 4: Create Examples Files

### Good Examples

Create `.cursor/kb/{rule_id}/examples/good_examples.md`:

```markdown
# Good Examples of `{rule_id}` Implementation

[Include good examples here with explanations of why they are good]
```

### Bad Examples

Create `.cursor/kb/{rule_id}/examples/bad_examples.md`:

```markdown
# Bad Examples of `{rule_id}` Implementation

[Include bad examples here with explanations of why they are bad and how to fix them]
```

## Step 5: Create Templates

Create `.cursor/kb/{rule_id}/templates/implementation_template.md`:

```markdown
# Implementation Template

[Include a customizable template for implementing the rule]
```

## Step 6: Create References

Create `.cursor/kb/{rule_id}/references/external_references.yaml`:

```yaml
references:
  - title: "Title 1"
    url: "URL 1"
    description: "Description 1"

  - title: "Title 2"
    url: "URL 2"
    description: "Description 2"
```

## Step 7: Create Documentation

Create `.cursor/documentation/{rule_id}-documentation.md`:

```markdown
# {rule_id} Documentation

## Summary

[Provide a brief overview of the rule's purpose and benefits]

## Fundamental Concepts

[Explain key concepts underlying the rule]

## Principles

[Describe core principles guiding the rule]

## Processes

[Detail cognitive processes implemented by the rule]

## Architecture

[Describe knowledge base structure and organization]

## Delegates

[Explain LLM delegation roles and responsibilities]

## Examples

[Provide examples of rule application]

## Checklist

[Include implementation checklist for the rule]
```

## Step 8: Validate Implementation

1. Ensure all required files exist
2. Verify content quality
3. Check reference integrity
4. Validate documentation completeness

## Implementation Checklist

- [ ] Rule file created with correct structure
- [ ] Knowledge base directory structure created
- [ ] Guidelines files created
- [ ] Examples files created
- [ ] Templates created
- [ ] References created
- [ ] Documentation created
- [ ] Implementation validated
