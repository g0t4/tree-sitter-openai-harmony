package tree_sitter_harmony_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_harmony "github.com/g0t4/tree-sitter-harmony/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_harmony.Language())
	if language == nil {
		t.Errorf("Error loading Harmony grammar")
	}
}
