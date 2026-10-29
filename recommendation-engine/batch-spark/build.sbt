name := "spark-adamic-adar-recommendation"

version := "1.0.0"

scalaVersion := "2.12.18"

val sparkVersion = "3.5.0"

libraryDependencies ++= Seq(
  // Apache Spark 3.5.x
  "org.apache.spark" %% "spark-core" % sparkVersion % "provided",
  "org.apache.spark" %% "spark-sql"  % sparkVersion % "provided",

  // Redis Client - Jedis with high performance pipelining
  "redis.clients" % "jedis" % "5.1.0",

  // CLI Parsing & TypeSafe Config
  "com.github.scopt" %% "scopt" % "4.1.0",
  "com.typesafe" % "config" % "1.4.3",

  // Testing
  "org.scalatest" %% "scalatest" % "3.2.17" % Test
)

// Assembly configuration for deploying Fat JAR to Spark Cluster
assembly / assemblyMergeStrategy := {
  case PathList("META-INF", xs @ _*) =>
    xs match {
      case "MANIFEST.MF" :: Nil => MergeStrategy.discard
      case "services" :: _      => MergeStrategy.concat
      case _                    => MergeStrategy.discard
    }
  case "reference.conf" => MergeStrategy.concat
  case _                => MergeStrategy.first
}
