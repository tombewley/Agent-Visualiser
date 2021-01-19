import sys 
import pandas as pd
import numpy as np
import hyperrectangles as hr
import json

IN = ['pos_x','pos_y']
OUT = ['main_engine']

df = pd.read_csv(f"public/data/{sys.argv[1]}.csv", index_col=0)
space = hr.Space(df.values, list(df.columns))
tree = space.tree_best_first('SAC', IN, OUT, 
                              sorted_indices=space.all_sorted_indices, 
                              max_num_leaves=10)

regions = []
for leaf in tree.leaves:
    (xl, xu), (yl, yu) = leaf.bb_min[tree.split_dims]
    samples = [list(x) for x in leaf.space.data[leaf.sorted_indices[:,0][:,None], tree.split_dims]]
    regions.append({"xl":xl, "xu":xu, "yl":yl, "yu":yu, "samples":samples})
    
data = {"filename":sys.argv[1], "regions":regions}

print(json.dumps(data))