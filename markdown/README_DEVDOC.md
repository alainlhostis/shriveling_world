# Developper documentation of the project _Shriveling World_
* The main function of the project is [merger](/classes/_bigboard_merger_.merger.html)
* The main parameter of the model is [alpha] determining the slope of [cones] based on the ratio between [road] speed and the maximum available speed at the period considered
* data structures of the project are defined as [interfaces] in the file: /definitions/project.ts

## Components of the three-dimensional structure / Vocabulary of the project
* The model is based on a [transport network] linking cities (see [conceptual framework imagefor geographical time-space representation](https://timespace.hypotheses.org/184))
* the [data model](https://github.com/theworldisnotflat/shriveling_world/blob/master/model/modeles7.png):
![data model](https://github.com/theworldisnotflat/shriveling_world/blob/master/model/modeles7.png)
* Explanations about the [terminology choices can be found here](https://timespace.hypotheses.org/177)
* the [graph] representing this transport network is made of cities and [edges]
* [edges] are the vertice of the [graph]; edges are only mathematical entities, not to be confounded with their graphical expression as [curves]
* [curves] are the graphical objects representing the graph [edges]; in the model, curves may be
  * straigt lines,
  * broken lines,
  * geodesics or
  * three dimensional curves
* [cones] are generated from an angle [alpha] computed by comparing the (terrestrial) speed on the cone with the speed of the fastest tansport mode considered in the given period
  * [cones] may have a constant and uniform slope based on a unique [alpha]
  * [cones] may have a different slope
  * [cones] may have different slopes (complex alphas) if different terrestrial transport networks are considered (not yet  implemented)