# Rule Structure Guide

## Overview

This guide provides a comprehensive overview of the structure for the `{rule_id}` rule. Following this structure ensures consistency and maximizes the rule's effectiveness within the Cursor rule ecosystem.

## Rule File Structure

The rule file (`.cursor/rules/{rule_id}.mdc`) should follow this structure:

1. **Knowledge References Section**

   - Define knowledge base paths and references
   - Include domain-specific references to guidelines, examples, templates, and references

2. **Principles Section**

   - Define primary goals with priorities
   - Outline design principles with their benefits

3. **Cognitive Operations Section**

   - Define key processes/operations with:
     - Clear sequential steps or related action groups
     - Input parameters and their purpose
     - Expected outputs and transformations

4. **LLM Delegation Section**

   - Define specialized roles for the LLM
   - Specify inputs and expected outputs for each role
   - Detail evaluation criteria for quality assurance

5. **Constraints Section**

   - List critical constraints with priority levels
   - Define domain-specific constraints
   - Include validation rules

6. **Summary Section**
   - Concise summary of the rule's domains and integrations

## Knowledge Base Structure

The knowledge base (KB) for this rule should be organized as follows:

```
.cursor/kb/{rule_id}/
├── guidelines/
│   ├── structure_guide.md           # This file
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

## Documentation Structure

The documentation (`.cursor/documentation/{rule_id}-documentation.md`) should contain:

1. **Summary**

   - Brief overview of the rule's purpose and benefits

2. **Fundamental Concepts**

   - Key concepts underlying the rule

3. **Principles**

   - Core principles guiding the rule

4. **Processes**

   - Cognitive processes implemented by the rule

5. **Architecture**

   - Knowledge base structure and organization

6. **Delegates**

   - LLM delegation roles and responsibilities

7. **Examples**

   - Examples of rule application

8. **Checklist**
   - Implementation checklist for the rule

## Implementation Requirements

To ensure proper implementation of this rule:

1. **Critical Requirements** (must be fulfilled)

   - Rule file must follow the structure above
   - All required KB directories and files must exist
   - Documentation must include all required sections

2. **Standard Requirements** (should be fulfilled)

   - Examples should cover common use cases
   - Templates should be comprehensive
   - Implementation guide should be detailed and clear

3. **Enhanced Requirements** (for exemplary status)
   - Include advanced examples
   - Provide comprehensive reference materials
   - Create additional templates for complex use cases

## Validation Process

The rule will be validated based on:

1. **File existence** - All required files must exist
2. **Content quality** - Content must be meaningful and relevant
3. **Reference integrity** - All references must be valid
4. **Documentation completeness** - Documentation must be comprehensive

## Certification Levels

Based on the implementation quality, the rule may receive one of these certification levels:

1. **Uncertified** - Does not meet critical requirements
2. **Provisional** - Meets critical requirements but lacks some standard requirements
3. **Certified** - Meets all critical and standard requirements
4. **Exemplary** - Meets critical, standard, and enhanced requirements
