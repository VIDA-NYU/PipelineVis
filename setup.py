from setuptools import setup, find_packages

with open("README.md", "r") as fh:
    long_description = fh.read()

setup(
    name="pipelineprofiler",
    version="0.1.15",
    author="Jorge Piazentin Ono, Sonia Castelo, Roque Lopez, Enrico Bertini, Juliana Freire, Claudio Silva",
    author_email="jorgehpo@nyu.edu",
    description="Pipeline Profiler tool. Enables the exploration of D3M pipelines in Jupyter Notebooks",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/VIDA-NYU/PipelineVis",
    packages=find_packages(exclude=['js', 'node_modules']),
    include_package_data=True,
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: BSD License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.6',
    install_requires=[
        "python-dateutil",
        "numpy",
        "scipy",
        "scikit-learn",
        "networkx",
        "notebook"
    ]
)
