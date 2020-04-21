from setuptools import setup, find_packages

setup(
    name="pipelineprofiler",
    description="Pipeline Profiler module. Enables the exploration of D3M pipelines in Jupyter Notebooks",
    version="0.1",
    packages=find_packages(exclude=['js', 'node_modules']),
    include_package_data=True,
)