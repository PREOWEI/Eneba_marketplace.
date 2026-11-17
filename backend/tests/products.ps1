$ErrorActionPreference = 'Stop'
function Products($query) { Invoke-RestMethod ('http://127.0.0.1:8000/api/products' + $query) }
$all = Products ''
if ($all.Count -lt 12) { throw 'Catalog missing products' }
foreach ($query in @('?q=elden', '?q=elden%20rign', '?q=ELDEN')) {
 $items = Products $query
 if ($items.Count -ne 1 -or $items[0].name -ne 'Elden Ring') { throw "Search failed: $query" }
}
$items = Products '?q=elden%20rign&platform=Steam&region=Europe&minPrice=30&maxPrice=40&sort=price_desc'
if ($items.Count -ne 1 -or $items[0].name -ne 'Elden Ring') { throw 'Combined filters failed' }
$items = Products '?platform=Steam&region=Europe&minPrice=20&maxPrice=40'
if ($items.Count -eq 0) { throw 'Expected matching products' }
foreach ($item in $items) { if ($item.platform -ne 'Steam' -or $item.region -ne 'Europe' -or $item.price -lt 20 -or $item.price -gt 40) { throw 'Filter mismatch' } }
foreach ($sort in @('price_asc','price_desc','name')) {
 $items = Products ('?sort=' + $sort)
 for ($i=1; $i -lt $items.Count; $i++) {
  if ($sort -eq 'price_asc' -and $items[$i-1].price -gt $items[$i].price) { throw 'Ascending sort failed' }
  if ($sort -eq 'price_desc' -and $items[$i-1].price -lt $items[$i].price) { throw 'Descending sort failed' }
  if ($sort -eq 'name' -and [string]::Compare($items[$i-1].name,$items[$i].name,$true) -gt 0) { throw 'Name sort failed' }
 }
}
if ((Products '?q=zzzznomatch').Count -ne 0) { throw 'Empty search failed' }
foreach ($query in @('?minPrice=50&maxPrice=10','?minPrice=-1','?sort=invalid','?q[]=x')) {
 $status = curl.exe -sS -o NUL -w '%{http_code}' ('http://127.0.0.1:8000/api/products' + $query) --globoff
 if ($status -ne '400') { throw "Validation failed: $query" }
}
$facets = Invoke-RestMethod 'http://127.0.0.1:8000/api/products/filters'
if ($facets.platforms -notcontains 'Steam' -or $facets.regions -notcontains 'Europe') { throw 'Missing facets' }
Write-Output "PASS: catalog ($($all.Count)), partial/typo/case search, combined filters, all sorts, empty results, invalid inputs, facets."

# Autocomplete: typo correction, five-result cap, filters and exact selection.
$suggestions = Invoke-RestMethod 'http://127.0.0.1:8000/api/products/suggestions?q=elden%20rign&platform=Steam&region=Europe&minPrice=30&maxPrice=40'
if ($suggestions.items.Count -ne 1 -or $suggestions.items[0].id -ne 'elden-ring' -or $suggestions.didYouMean -ne 'Elden Ring') { throw 'Autocomplete correction/filters failed' }
$partial = Invoke-RestMethod 'http://127.0.0.1:8000/api/products/suggestions?q=elden'
if ($null -ne $partial.didYouMean) { throw 'Partial names must not be flagged as typos' }
$limited = Invoke-RestMethod 'http://127.0.0.1:8000/api/products/suggestions?q=a'
if ($limited.items.Count -gt 5) { throw 'Suggestion limit exceeded' }
$empty = Invoke-RestMethod 'http://127.0.0.1:8000/api/products/suggestions?q=zzzznomatch'
if ($empty.items.Count -ne 0) { throw 'Unexpected suggestions' }
$selected = Products '?id=elden-ring&platform=Steam&region=Europe'
if ($selected.Count -ne 1 -or $selected[0].id -ne 'elden-ring') { throw 'Exact selection failed' }
Write-Output 'PASS: autocomplete, typo hint, limit, empty suggestions and selected product.'
