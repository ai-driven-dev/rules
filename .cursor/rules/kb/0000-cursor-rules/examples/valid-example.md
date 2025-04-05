# Exemple de Règle Bien Structurée

Cet exemple montre une règle Cursor conforme aux principes de séparation cognitive/KB/LLM.

```mdc
---
name: Naming Convention for React Components
description: "ENFORCE when WRITING React components to ENSURE consistency and readability"
categories: [react, conventions, naming, frontend]
glob: "**/*.{jsx,tsx}"
always_apply: true
doc_links:
  - https://reactjs.org/docs/jsx-in-depth.html
  - https://airbnb.io/javascript/react/
---

# React Component Naming Convention

↹ kb•react•naming [p=1] {
  ⊕ patterns: ".cursor/kb/react-naming/patterns.yaml",
  ⊕ conventions: ".cursor/kb/react-naming/conventions.md",
  ⊕ examples: {
    good: ".cursor/kb/react-naming/examples/good-examples.md",
    bad: ".cursor/kb/react-naming/examples/bad-examples.md"
  },
  ⊕ style_guide: ".cursor/kb/react-naming/airbnb-style-guide.yaml"
}
Σ knowledge•references

↹ principles•core [p=1] {
  ⊕ consistency {
    project_wide: follow_single_pattern_across_codebase | for: maintenance,
    industry_standard: follow_established_conventions | for: onboarding
  }

  ⊕ clarity {
    descriptive: name_reveals_purpose | not: implementation_details,
    specific: prefer_specific_over_generic | avoid: ambiguity
  }
}
Σ guiding•principles

↹ Ω•evaluate•component•name [p=1] -> (
  parse•name(component_name: string)
  → check•pascal•case(
      first_char_uppercase: true,
      no_spaces_or_special_chars: true
      | ref: kb•react•naming.patterns.pascal_case
  )
  → check•descriptiveness(
      generic_names: ["Component", "Page", "Element"] | verdict: too_generic,
      minimum_length: 3 | excluding: ["Row", "Tab", "Nav"]
  )
  → verify•semantics(
      verb_in_name: false | except: event_handlers,
      follows_domain_language: true | ref: kb•react•naming.domain_specific
  )
  → validate•consistency(component_name, project_patterns)
  → decide(
      valid: all_checks_passed,
      suggestions: specific_improvements | if: any_check_failed
  )
)
Σ name•evaluation•process

↹ Ω•fix•component•name [p=1] -> [
  ⊕ correct•casing {
    convert•to•pascal•case | ref: kb•react•naming.patterns.pascal_case,
    handle•acronyms | standard: all_caps_if_≤_2_chars
  }

  ⊕ improve•descriptiveness {
    add•context•if•generic | example: "Button" → "SubmitButton",
    incorporate•domain•concepts | ref: kb•react•naming.domain_specific,
    check•against•patterns | ref: kb•react•naming.patterns.component_types
  }

  ⊕ ensure•consistency {
    check•similar•components | maintain: naming_patterns,
    align•with•project•standards | if_exists: naming_convention_docs
  }
]
Σ name•correction•process

↹ LLM•naming•analyzer [p=1] {
  ⊕ tasks {
    pattern_detection: identify_naming_patterns_in_codebase | ref: Ω•evaluate•component•name,
    suggestion_generation: propose_improved_names | ref: Ω•fix•component•name,
    documentation_creation: document_decisions_and_reasons | for: knowledge_sharing
  }

  ⊕ inputs {
    component_name: name_to_evaluate | for: pattern_detection,
    component_purpose: clear_description_of_purpose | for: suggestion_generation,
    existing_components: related_component_names | for: consistency_analysis,
    project_conventions: established_naming_rules | if_available: true
  }

  ⊕ outputs {
    evaluation_result: {
      is_valid: boolean,
      issues: Array<{type: string, description: string}>,
      score: 0-100
    },
    improvement_suggestions: Array<{
      suggested_name: string,
      rationale: string
    }>,
    pattern_documentation: documentation_for_project_standards
  }

  ⊕ constraints {
    respect_domain_language: preserve_domain_specific_terms | ref: kb•react•naming.domain_specific,
    maintain_consistency: prefer_consistency_over_perfect_names | when: established_patterns_exist,
    consider_context: component_hierarchy_affects_naming | ref: kb•react•naming.patterns.component_hierarchy
  }

  ⊕ validation_criteria {
    suggestion_quality: names_are_clear_and_specific | not: vague_or_too_general,
    context_awareness: respects_existing_project_patterns | not: isolated_decision,
    explainability: provides_clear_rationale | for: learning_and_improvement
  }
}
Σ llm•naming•analysis

↹ patterns•naming [p=2] {
  ⊕ component•types {
    page: "PageName" | ex: "HomePage", "ProfilePage",
    layout: "LayoutName" | ex: "MainLayout", "DashboardLayout",
    container: "ContainerName" | ex: "UserContainer", "ProductContainer",
    ui: "ComponentName" | ex: "Button", "Card",
    hoc: "withName" | ex: "withAuth", "withTheme"
  }

  ⊕ naming•considerations {
    context: include_context_if_reusable | ex: "ProfileAvatar" vs just "Avatar",
    domain: use_domain_terminology | ex: "InvoiceLineItem" vs generic "Row",
    purpose: name_indicates_purpose | ex: "FilterButton" vs just "Button"
  }
}
Σ naming•patterns | ref: kb•react•naming.patterns

↹ anti•patterns [p=2] {
  ⊕ naming•mistakes [
    camel_case: "userCard" | React_components_use_PascalCase,
    snake_case: "user_card" | not_conventional_in_React,
    implementation: "RedButtonWithHoverEffect" | describes_implementation_not_purpose,
    non_descriptive: "Component1", "Thing", "Item" | too_generic,
    non_noun: "Loading", "Processing" | components_should_be_nouns
  ]
}
Σ antipatterns•to•avoid | ref: kb•react•naming.examples.bad

Σ react•component•naming ⊕ convention ⊕ readability ⊕ maintainability
```

Cet exemple illustre bien les trois piliers:

1. **Références KB (`kb•react•naming`)**  
   Pointe vers des fichiers externes contenant les connaissances sur les conventions de nommage, exemples, etc.

2. **Processus Cognitifs (`Ω•evaluate•component•name` et `Ω•fix•component•name`)**  
   Définit comment réfléchir au problème du nommage, pas juste quelles sont les règles.

3. **Délégation LLM (`LLM•naming•analyzer`)**  
   Structure précisément comment le LLM doit analyser les noms, ce qu'il reçoit en entrée, ce qu'il doit produire, et les contraintes à respecter.

Les sections supplémentaires (`principles•core`, `patterns•naming`, `anti•patterns`) enrichissent la règle tout en respectant la séparation des préoccupations.
