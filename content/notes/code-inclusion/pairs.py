# A harmless source specimen; inclusion never runs it.

def matching_pair(values, target):
    seen = {}
    for index, value in enumerate(values):
        if target - value in seen:
            return seen[target - value], index
        seen[value] = index
    return None

# Literal data, not Markdown or a shortcode:
example = "<tag> & ``` {{< not-a-shortcode >}}"
