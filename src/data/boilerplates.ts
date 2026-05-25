// ─── Boilerplate generators ────────────────────────────────────────────────────
// Each returns a complete C++ file: the function signature to fill + driver code.

export const arr1 = (fn: string, ret: string, extra = '') => `#include <bits/stdc++.h>
using namespace std;
${extra}
${ret} ${fn}(vector<int>& arr, int n) {
    // Write your code here

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    vector<int> arr(n);
    for(int i = 0; i < n; i++) cin >> arr[i];
    ${ret === 'void' ? `${fn}(arr, n);\n    for(int x : arr) cout << x << " ";` : `cout << ${fn}(arr, n);`}
    cout << endl;
    return 0;
}`;

export const arr2 = (fn: string, ret: string) => `#include <bits/stdc++.h>
using namespace std;

${ret} ${fn}(vector<int>& arr1, vector<int>& arr2, int n, int m) {
    // Write your code here

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n, m;
    cin >> n >> m;
    vector<int> a(n), b(m);
    for(int i = 0; i < n; i++) cin >> a[i];
    for(int i = 0; i < m; i++) cin >> b[i];
    cout << ${fn}(a, b, n, m) << endl;
    return 0;
}`;

export const str1 = (fn: string, ret: string) => `#include <bits/stdc++.h>
using namespace std;

${ret} ${fn}(string s) {
    // Write your code here

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s;
    cin >> s;
    cout << ${fn}(s) << endl;
    return 0;
}`;

export const str2 = (fn: string, ret: string) => `#include <bits/stdc++.h>
using namespace std;

${ret} ${fn}(string s1, string s2) {
    // Write your code here

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string s1, s2;
    cin >> s1 >> s2;
    cout << ${fn}(s1, s2) << endl;
    return 0;
}`;

export const matrix = (fn: string, ret: string) => `#include <bits/stdc++.h>
using namespace std;

${ret} ${fn}(vector<vector<int>>& mat, int n, int m) {
    // Write your code here

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n, m;
    cin >> n >> m;
    vector<vector<int>> mat(n, vector<int>(m));
    for(int i = 0; i < n; i++)
        for(int j = 0; j < m; j++)
            cin >> mat[i][j];
    cout << ${fn}(mat, n, m) << endl;
    return 0;
}`;

export const LL_BOILERPLATE = (fn: string, retType: string, extra = '') => `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode* next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode* next) : val(x), next(next) {}
};
${extra}
${retType} ${fn}(ListNode* head) {
    // Write your code here

}

ListNode* makeList(vector<int>& v) {
    ListNode dummy(0);
    ListNode* cur = &dummy;
    for(int x : v) { cur->next = new ListNode(x); cur = cur->next; }
    return dummy.next;
}
void printList(ListNode* head) {
    while(head) { cout << head->val; if(head->next) cout << " -> "; head = head->next; }
    cout << "\\n";
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n; cin >> n;
    vector<int> v(n);
    for(int i = 0; i < n; i++) cin >> v[i];
    ListNode* head = makeList(v);
    ${retType === 'ListNode*' ? 'printList(' + fn + '(head));' : `cout << ${fn}(head) << "\\n";`}
    return 0;
}`;

export const TREE_BOILERPLATE = (fn: string, retType: string, extraParam = '') => `#include <bits/stdc++.h>
using namespace std;

struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode* left, TreeNode* right) : val(x), left(left), right(right) {}
};

${retType} ${fn}(TreeNode* root${extraParam ? ', ' + extraParam : ''}) {
    // Write your code here

}

TreeNode* build(vector<string>& v, int i) {
    if(i >= (int)v.size() || v[i] == "null") return nullptr;
    TreeNode* node = new TreeNode(stoi(v[i]));
    node->left  = build(v, 2*i+1);
    node->right = build(v, 2*i+2);
    return node;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n; cin >> n;
    vector<string> v(n);
    for(int i = 0; i < n; i++) cin >> v[i];
    TreeNode* root = build(v, 0);
    cout << ${fn}(root) << "\\n";
    return 0;
}`;

export const GRAPH_BFS = `#include <bits/stdc++.h>
using namespace std;

vector<int> bfsOfGraph(int V, vector<vector<int>>& adj) {
    // Write your code here
    vector<int> bfs;
    vector<bool> visited(V, false);
    // use queue for BFS

    return bfs;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int V, E;
    cin >> V >> E;
    vector<vector<int>> adj(V);
    for(int i = 0; i < E; i++) {
        int u, v; cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    vector<int> ans = bfsOfGraph(V, adj);
    for(int x : ans) cout << x << " ";
    return 0;
}`;

export const GRAPH_DFS = `#include <bits/stdc++.h>
using namespace std;

void dfs(int node, vector<vector<int>>& adj, vector<bool>& visited, vector<int>& result) {
    visited[node] = true;
    result.push_back(node);
    // Write your code here

}

vector<int> dfsOfGraph(int V, vector<vector<int>>& adj) {
    vector<bool> visited(V, false);
    vector<int> result;
    dfs(0, adj, visited, result);
    return result;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int V, E;
    cin >> V >> E;
    vector<vector<int>> adj(V);
    for(int i = 0; i < E; i++) {
        int u, v; cin >> u >> v;
        adj[u].push_back(v);
        adj[v].push_back(u);
    }
    vector<int> ans = dfsOfGraph(V, adj);
    for(int x : ans) cout << x << " ";
    return 0;
}`;

export const DP1D = (fn: string) => `#include <bits/stdc++.h>
using namespace std;

// Memoization
int ${fn}(int n, vector<int>& dp) {
    if(n <= 1) return n; // base case – adjust as needed
    if(dp[n] != -1) return dp[n];
    // Write recurrence here
    return dp[n] = ${fn}(n-1, dp) + ${fn}(n-2, dp);
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    vector<int> dp(n+1, -1);
    cout << ${fn}(n, dp) << "\\n";
    return 0;
}`;

export const DP2D = (fn: string) => `#include <bits/stdc++.h>
using namespace std;

int ${fn}(int i, int j, vector<vector<int>>& grid, vector<vector<int>>& dp) {
    // Base cases
    if(i == 0 && j == 0) return grid[0][0];
    if(i < 0 || j < 0) return 1e9; // or 0 depending on problem
    if(dp[i][j] != -1) return dp[i][j];
    // Write recurrence here
    int up   = ${fn}(i-1, j, grid, dp);
    int left = ${fn}(i, j-1, grid, dp);
    return dp[i][j] = grid[i][j] + min(up, left);
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n, m;
    cin >> n >> m;
    vector<vector<int>> grid(n, vector<int>(m));
    for(int i = 0; i < n; i++)
        for(int j = 0; j < m; j++)
            cin >> grid[i][j];
    vector<vector<int>> dp(n, vector<int>(m, -1));
    cout << ${fn}(n-1, m-1, grid, dp) << "\\n";
    return 0;
}`;

export const KNAPSACK_01 = `#include <bits/stdc++.h>
using namespace std;

// 0/1 Knapsack – memoization
int knapsack(int index, int W, vector<int>& wt, vector<int>& val, vector<vector<int>>& dp) {
    if(index == 0) {
        if(wt[0] <= W) return val[0];
        return 0;
    }
    if(dp[index][W] != -1) return dp[index][W];
    // Write your code here
    int notTake = knapsack(index-1, W, wt, val, dp);
    int take = 0;
    if(wt[index] <= W)
        take = val[index] + knapsack(index-1, W - wt[index], wt, val, dp);
    return dp[index][W] = max(take, notTake);
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n, W;
    cin >> n >> W;
    vector<int> wt(n), val(n);
    for(int i = 0; i < n; i++) cin >> wt[i];
    for(int i = 0; i < n; i++) cin >> val[i];
    vector<vector<int>> dp(n, vector<int>(W+1, -1));
    cout << knapsack(n-1, W, wt, val, dp) << "\\n";
    return 0;
}`;

export const PATTERN = (num: number) => `#include <bits/stdc++.h>
using namespace std;

void pattern${num}(int n) {
    // Write your code here – print Pattern ${num}

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    pattern${num}(n);
    return 0;
}`;

export const RECURSION_BASE = (fn: string, sig: string, ret: string) => `#include <bits/stdc++.h>
using namespace std;

${ret} ${fn}(${sig}) {
    // Base case

    // Recursive case

}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    cout << ${fn}(n) << "\\n";
    return 0;
}`;

export const BACKTRACK = (fn: string) => `#include <bits/stdc++.h>
using namespace std;

void ${fn}(int index, vector<int>& arr, vector<int>& current, vector<vector<int>>& result) {
    // Base case – add to result
    result.push_back(current);

    for(int i = index; i < (int)arr.size(); i++) {
        // Choose
        current.push_back(arr[i]);
        // Explore
        ${fn}(i + 1, arr, current, result); // change i+1 to i for unlimited picks
        // Unchoose
        current.pop_back();
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    cin >> n;
    vector<int> arr(n);
    for(int i = 0; i < n; i++) cin >> arr[i];
    vector<vector<int>> result;
    vector<int> current;
    ${fn}(0, arr, current, result);
    for(auto& v : result) {
        for(int x : v) cout << x << " ";
        cout << "\\n";
    }
    return 0;
}`;

export const TRIE_BOILERPLATE = `#include <bits/stdc++.h>
using namespace std;

struct TrieNode {
    TrieNode* children[26];
    bool isEnd;
    TrieNode() : isEnd(false) {
        fill(children, children + 26, nullptr);
    }
};

class Trie {
public:
    TrieNode* root;
    Trie() { root = new TrieNode(); }

    void insert(string& word) {
        // Write your code here

    }

    bool search(string& word) {
        // Write your code here
        return false;
    }

    bool startsWith(string& prefix) {
        // Write your code here
        return false;
    }
};

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    Trie trie;
    int q; cin >> q;
    while(q--) {
        int type; string s;
        cin >> type >> s;
        if(type == 1) trie.insert(s);
        else if(type == 2) cout << (trie.search(s) ? "true" : "false") << "\\n";
        else cout << (trie.startsWith(s) ? "true" : "false") << "\\n";
    }
    return 0;
}`;
